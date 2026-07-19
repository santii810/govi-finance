from __future__ import annotations

import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from worker.accounts import Account, load_accounts
from worker.accounts_store import find_account_by_slug, load_accounts_from_nocodb
from worker.bot.config import BotConfig
from worker.import_service import create_account_dump, finalize_account_dump, import_movements
from worker.models import ClassifiedMovement, ImportPreview, Persona
from worker.nocodb import NocoDbClient, NocoDbError
from worker.preview import analyze_file

import httpx

logger = logging.getLogger(__name__)

SESSION_KEY = "import_session"


@dataclass
class ImportSession:
    file_path: Path
    source_filename: str
    preview: ImportPreview
    movements: list[ClassifiedMovement]
    parser_name: str
    account_nocodb_id: int | None = None


def _is_allowed(config: BotConfig, user_id: int) -> bool:
    if not config.allowed_user_ids:
        return True
    return user_id in config.allowed_user_ids


def _preview_keyboard(
    session: ImportSession,
    accounts: list[Account],
    *,
    sender_persona: Persona | None = None,
) -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton("✅ Sí, importar", callback_data="import:confirm"),
            InlineKeyboardButton("❌ Cancelar", callback_data="import:cancel"),
        ],
    ]
    matches = [a for a in accounts if a.parser == session.parser_name]
    if sender_persona:
        matches = [
            a for a in matches if a.persona == sender_persona or a.persona == "Común"
        ]
    if len(matches) > 1:
        for account in matches:
            rows.append(
                [InlineKeyboardButton(f"✎ {account.label}", callback_data=f"import:account:{account.id}")]
            )
    return InlineKeyboardMarkup(rows)


def _log_user(user) -> None:
    logger.info(
        "Telegram user id=%s username=%s name=%s",
        user.id,
        user.username or "-",
        user.full_name or "-",
    )


def _format_sender(user) -> str:
    username = f"@{user.username}" if user.username else "sin @"
    name = user.full_name or "Usuario"
    return f"{name} ({username}, id={user.id})"


async def _notify_owner(
    context: ContextTypes.DEFAULT_TYPE,
    config: BotConfig,
    sender_id: int,
    text: str,
) -> None:
    owner_id = config.owner_user_id
    if owner_id is None or sender_id == owner_id:
        return
    try:
        await context.bot.send_message(chat_id=owner_id, text=text)
    except Exception:
        logger.exception("No se pudo enviar aviso al propietario (id=%s)", owner_id)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    config: BotConfig = context.application.bot_data["config"]
    user = update.effective_user
    if user is None:
        return
    if not _is_allowed(config, user.id):
        logger.info(
            "Acceso denegado: Telegram user id=%s username=%s name=%s",
            user.id,
            user.username or "-",
            user.full_name or "-",
        )
        await _notify_owner(
            context,
            config,
            user.id,
            f"👤 {_format_sender(user)} ha intentado usar el bot (/start) pero no tiene permiso.",
        )
        await update.message.reply_text("No tienes permiso para usar este bot.")
        return
    _log_user(user)
    await update.message.reply_text(
        "Envíame un export bancario (CSV o Excel).\n\n"
        "Analizaré el fichero, te mostraré banco/cuenta/persona y fechas, "
        "y solo insertaré en Finanzas tras tu confirmación."
    )


async def document_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    config: BotConfig = context.application.bot_data["config"]
    message = update.message
    user = update.effective_user
    if message is None or user is None or message.document is None:
        return

    document = message.document
    filename = document.file_name or "export.csv"
    suffix = Path(filename).suffix.lower()
    if not _is_allowed(config, user.id):
        await _notify_owner(
            context,
            config,
            user.id,
            f"⚠️ {_format_sender(user)} ha intentado enviar «{filename}» pero no tiene permiso.",
        )
        await message.reply_text("No tienes permiso para usar este bot.")
        return
    if suffix not in {".csv", ".xlsx", ".xls"}:
        await _notify_owner(
            context,
            config,
            user.id,
            f"📎 {_format_sender(user)} ha enviado «{filename}».\n\n"
            "Formato no aceptado (solo CSV o Excel).",
        )
        await message.reply_text("Solo acepto exports CSV o Excel (.csv, .xlsx).")
        return

    await message.reply_text("Recibido. Analizando…")

    tg_file = await document.get_file()
    temp_dir = Path(tempfile.gettempdir()) / "finanzas-imports"
    temp_dir.mkdir(parents=True, exist_ok=True)
    file_path = temp_dir / f"{user.id}_{document.file_unique_id}{suffix or '.csv'}"
    await tg_file.download_to_drive(custom_path=str(file_path))

    client = NocoDbClient(config.nocodb_url, config.nocodb_token)
    accounts = await load_accounts_from_nocodb(client, config.accounts_table_id)

    try:
        sender_persona = config.persona_for_user(user.id)
        preview, movements = analyze_file(
            file_path,
            accounts=accounts,
            sender_persona=sender_persona,
        )
    except ValueError as exc:
        file_path.unlink(missing_ok=True)
        await _notify_owner(
            context,
            config,
            user.id,
            f"📎 {_format_sender(user)} ha enviado «{filename}».\n\n"
            f"No se pudo analizar: {exc}",
        )
        await message.reply_text(f"No he podido analizar el fichero: {exc}")
        return
    except UnicodeDecodeError:
        file_path.unlink(missing_ok=True)
        await _notify_owner(
            context,
            config,
            user.id,
            f"📎 {_format_sender(user)} ha enviado «{filename}».\n\n"
            "No se pudo leer el fichero (problema de codificación).",
        )
        await message.reply_text(
            "No he podido leer el fichero como CSV de texto. "
            "Si es un Excel, reenvíalo tal cual (aunque la extensión diga .csv)."
        )
        return
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        logger.exception("Error analizando fichero %s", filename)
        await _notify_owner(
            context,
            config,
            user.id,
            f"📎 {_format_sender(user)} ha enviado «{filename}».\n\n"
            f"Error al analizar: {exc}",
        )
        await message.reply_text(f"No he podido analizar el fichero: {exc}")
        return

    if not preview.account_id:
        file_path.unlink(missing_ok=True)
        text = preview.to_bot_message() if preview.ambiguedades else "No he podido detectar la cuenta."
        await _notify_owner(
            context,
            config,
            user.id,
            f"📎 {_format_sender(user)} ha enviado «{filename}».\n\n{text}",
        )
        await message.reply_text(text)
        return

    from worker.parsers.registry import detect_parser

    parser_name = detect_parser(file_path)
    account = next((a for a in accounts if a.id == preview.account_id), None)
    session = ImportSession(
        file_path=file_path,
        source_filename=filename,
        preview=preview,
        movements=movements,
        parser_name=parser_name or "",
        account_nocodb_id=account.nocodb_id if account else None,
    )
    context.user_data[SESSION_KEY] = session

    await _notify_owner(
        context,
        config,
        user.id,
        f"📎 {_format_sender(user)} ha enviado «{filename}».\n\n{preview.to_bot_message()}",
    )
    await message.reply_text(
        preview.to_bot_message(),
        reply_markup=_preview_keyboard(session, accounts, sender_persona=sender_persona),
    )


async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    config: BotConfig = context.application.bot_data["config"]
    query = update.callback_query
    user = update.effective_user
    if query is None or user is None:
        return
    if not _is_allowed(config, user.id):
        await query.answer("Sin permiso", show_alert=True)
        return

    await query.answer()
    data = query.data or ""
    session: ImportSession | None = context.user_data.get(SESSION_KEY)

    if data == "import:cancel":
        _clear_session(context, session)
        await query.edit_message_text("Importación cancelada. No se ha insertado nada.")
        return

    if data.startswith("import:account:"):
        if session is None:
            await query.edit_message_text("La sesión ha expirado. Vuelve a enviar el fichero.")
            return
        account_id = data.removeprefix("import:account:")
        client = NocoDbClient(config.nocodb_url, config.nocodb_token)
        accounts = await load_accounts_from_nocodb(client, config.accounts_table_id)
        try:
            preview, movements = analyze_file(
                session.file_path,
                account_id=account_id,
                accounts=accounts,
                sender_persona=config.persona_for_user(user.id),
            )
        except ValueError as exc:
            await query.edit_message_text(f"Error al re-analizar: {exc}")
            return
        if not preview.account_id:
            await query.edit_message_text(preview.to_bot_message())
            return
        account = next((a for a in accounts if a.id == preview.account_id), None)
        session = ImportSession(
            file_path=session.file_path,
            source_filename=session.source_filename,
            preview=preview,
            movements=movements,
            parser_name=session.parser_name,
            account_nocodb_id=account.nocodb_id if account else None,
        )
        context.user_data[SESSION_KEY] = session
        await query.edit_message_text(
            preview.to_bot_message(),
            reply_markup=_preview_keyboard(
                session,
                accounts,
                sender_persona=config.persona_for_user(user.id),
            ),
        )
        return

    if data == "import:confirm":
        if session is None:
            await query.edit_message_text("La sesión ha expirado. Vuelve a enviar el fichero.")
            return
        await query.edit_message_text("Importando…")
        client = NocoDbClient(config.nocodb_url, config.nocodb_token)
        account_nocodb_id = session.account_nocodb_id
        if account_nocodb_id is None:
            account = await find_account_by_slug(
                client,
                config.accounts_table_id,
                session.preview.account_id,
            )
            account_nocodb_id = account.nocodb_id if account else None
        if account_nocodb_id is None:
            await query.edit_message_text("No se encontró la cuenta en NocoDB. Revisa la tabla Accounts.")
            return
        try:
            dump = await create_account_dump(
                client,
                config.account_dumps_table_id,
                nombre_fichero=session.source_filename,
                account_nocodb_id=account_nocodb_id,
                fecha_desde=session.preview.fecha_desde,
                fecha_hasta=session.preview.fecha_hasta,
                num_registros=len(session.movements),
            )
            result = await import_movements(
                client,
                config.automatic_actions_table_id,
                session.movements,
                account_dump_id=int(dump["Id"]),
            )
            await finalize_account_dump(
                client,
                config.account_dumps_table_id,
                int(dump["Id"]),
                result,
            )
        except NocoDbError as exc:
            logger.exception("NocoDB import failed")
            await query.edit_message_text(f"Error al insertar en NocoDB ({exc.status}): {exc}")
            return
        finally:
            _clear_session(context, session)

        await query.edit_message_text(
            "Importación completada.\n\n"
            f"  • Fichero: {session.source_filename}\n"
            f"  • Nuevos: {result.inserted}\n"
            f"  • Ya existían (omitidos): {result.skipped}\n"
            f"  • Total en fichero: {result.total}\n\n"
            "Revisa las tareas pendientes en la web."
        )
        return

    await query.edit_message_text("Acción no reconocida.")


def _clear_session(context: ContextTypes.DEFAULT_TYPE, session: ImportSession | None) -> None:
    if session is not None:
        session.file_path.unlink(missing_ok=True)
    context.user_data.pop(SESSION_KEY, None)


def build_application(config: BotConfig) -> Application:
    application = Application.builder().token(config.telegram_token).build()
    application.bot_data["config"] = config
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(MessageHandler(filters.Document.ALL, document_handler))
    application.add_handler(CallbackQueryHandler(callback_handler))
    return application


def main() -> None:
    logging.basicConfig(
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        level=logging.INFO,
    )
    config = BotConfig.from_env()
    application = build_application(config)
    logger.info(
        "Bot iniciado (allowed_users=%s, owner=%s)",
        len(config.allowed_user_ids) or "all",
        config.owner_user_id or "—",
    )
    application.run_polling(allowed_updates=Update.ALL_TYPES)
