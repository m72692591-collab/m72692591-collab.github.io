"""Framework-neutral adapter for an existing Python bot.
NOT an exposed HTTP service. The host must enforce HTTPS, verified sessions,
CSRF/origin policy, request byte limits, rate/concurrency limits and per-day
AI spend caps. No contact storage, notification or Avito action happens here.
"""
from __future__ import annotations
import asyncio
from dataclasses import dataclass
from typing import Awaitable, Callable, Mapping, Any
from uuid import UUID

class InvalidRequest(ValueError):
    pass

@dataclass(frozen=True)
class SiteMessage:
    request_id: str
    text: str
    session_key: str
    tenant: str = 'maestro'

PAGES = frozenset({'maestro-lab.html', 'brief-builder.html', 'index.html#lead'})

def parse_message(payload: Mapping[str, Any], *, verified_session_id: str) -> SiteMessage:
    # verified_session_id must come from a server-verified session, never unchecked JSON.
    if not isinstance(payload, Mapping) or set(payload) - {'request_id', 'text'}:
        raise InvalidRequest('Unsupported fields')
    try:
        request_id = str(UUID(str(payload.get('request_id', ''))))
        session_id = str(UUID(verified_session_id))
    except (ValueError, TypeError, AttributeError) as exc:
        raise InvalidRequest('Invalid request/session identifier') from exc
    text = payload.get('text')
    if not isinstance(text, str) or not 1 <= len(text.strip()) <= 4000:
        raise InvalidRequest('Message must contain 1–4000 characters')
    if len(text.encode('utf-8')) > 16000:
        raise InvalidRequest('Message is too large')
    return SiteMessage(request_id=request_id, text=text.strip(), session_key='web:'+session_id)

def public_response(value: Mapping[str, Any], request_id: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise ValueError('Engine must return a mapping')
    text = value.get('text')
    if not isinstance(text, str) or not 1 <= len(text) <= 6000:
        raise ValueError('Invalid engine text')
    actions=[]
    raw=value.get('actions', [])
    if isinstance(raw, list):
        for action in raw[:3]:
            if isinstance(action, Mapping) and action.get('type')=='navigate' and action.get('page') in PAGES:
                actions.append({'type':'navigate','page':action['page']})
    # Deliberately omit internal tools, access tokens, provider details and client records.
    return {'ok':True,'request_id':request_id,'text':text,'actions':actions}

async def dispatch(payload: Mapping[str, Any], *, verified_session_id: str,
                   engine: Callable[[SiteMessage], Awaitable[Mapping[str, Any]]],
                   timeout_seconds: float = 15.0) -> dict[str, Any]:
    if not 0 < timeout_seconds <= 30:
        raise ValueError('Timeout out of range')
    message=parse_message(payload, verified_session_id=verified_session_id)
    try:
        result=await asyncio.wait_for(engine(message), timeout=timeout_seconds)
    except asyncio.TimeoutError:
        return {'ok':False,'request_id':message.request_id,'error':'temporarily_unavailable'}
    return public_response(result,message.request_id)

# The host application provides its existing engine function. Do not create a second
# Telegram polling loop, do not change Avito webhooks, and do not publish the bot token.
