// web/src/api/chat.ts
import { api } from './client';
import type { AuthState } from '../state/authTypes';

export interface ChatDto {
  id: string;
  dealId: string;
  participants: string[]; // user ids
  createdAt: string;
}

export interface MessageTranslationDto {
  lang: string;
  text: string;
  autoTranslated: boolean;
  qualityScore?: number | null;
}

export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;     // user id
  text: string;
  originalLang: string;
  translations?: MessageTranslationDto[] | null;
  createdAt: string;
  editedAt?: string | null;
}

export interface MessageCreateInput {
  text: string;
  lang?: string; // например "ru"
}

export interface MessageTranslateResponseDto {
  text: string;
  targetLang: string;
}

/**
 * ѕолучить (и при необходимости создать) чат дл€ сделки.
 * Backend гарантирует, что если dealId существует, то после этого запроса
 * у пользовател€ будет чат с таким dealId.
 */
export async function getOrCreateChatForDeal(
  auth: AuthState,
  dealId: string,
): Promise<ChatDto> {
  const token = auth.tokens.accessToken;
  const chats = await api<ChatDto[]>(
    `/chats?dealId=${encodeURIComponent(dealId)}`,
    {},
    token,
  );
  if (!chats.length) {
    throw new Error('Chat not created for this deal');
  }
  // предполагаем один чат на сделку
  return chats[0];
}

/** —писок сообщений по chatId */
export async function listChatMessagesByChatId(
  auth: AuthState,
  chatId: string,
): Promise<MessageDto[]> {
  const token = auth.tokens.accessToken;
  return api<MessageDto[]>(
    `/chats/${encodeURIComponent(chatId)}/messages`,
    {},
    token,
  );
}

/** ќтправить сообщение в чат */
export async function sendChatMessageToChat(
  auth: AuthState,
  chatId: string,
  input: MessageCreateInput,
): Promise<MessageDto> {
  const token = auth.tokens.accessToken;
  return api<MessageDto>(
    `/chats/${encodeURIComponent(chatId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}

/** «апросить автоперевод конкретного сообщени€ в чате */
export async function translateMessageInChat(
  auth: AuthState,
  chatId: string,
  msgId: string,
  targetLang: string,
): Promise<MessageTranslateResponseDto> {
  const token = auth.tokens.accessToken;
  return api<MessageTranslateResponseDto>(
    `/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      msgId,
    )}/translate`,
    {
      method: 'POST',
      body: JSON.stringify({ targetLang }),
    },
    token,
  );
}