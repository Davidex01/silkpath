// src/api/chat.ts
import { api } from './client';
import type { AuthState } from '../state/authTypes';

export interface ChatDto {
  id: string;
  dealId: string;
  participants: string[];
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
  senderId: string;
  text: string;
  originalLang: string;
  translations?: MessageTranslationDto[] | null;
  createdAt: string;
  editedAt?: string | null;
}

export interface MessageCreateInput {
  text: string;
  lang?: string | null;
}

/** Получить или создать чат для сделки */
export async function getOrCreateChatForDeal(
  auth: AuthState,
  dealId: string,
): Promise<ChatDto> {
  // GET /chats?dealId=... автоматически создаёт чат если его нет
  const chats = await api<ChatDto[]>(
    `/chats?dealId=${dealId}`,
    {},
    auth.tokens.accessToken,
  );

  if (chats.length === 0) {
    throw new Error('Chat not created');
  }

  return chats[0];
}

/** Получить чат по ID */
export async function getChatById(
  auth: AuthState,
  chatId: string,
): Promise<ChatDto> {
  return api<ChatDto>(`/chats/${chatId}`, {}, auth.tokens.accessToken);
}

/** Список сообщений в чате */
export async function listChatMessagesByChatId(
  auth: AuthState,
  chatId: string,
): Promise<MessageDto[]> {
  return api<MessageDto[]>(
    `/chats/${chatId}/messages`,
    {},
    auth.tokens.accessToken,
  );
}

/** Отправить сообщение в чат */
export async function sendChatMessageToChat(
  auth: AuthState,
  chatId: string,
  input: MessageCreateInput,
): Promise<MessageDto> {
  return api<MessageDto>(
    `/chats/${chatId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    auth.tokens.accessToken,
  );
}

/** Перевести сообщение на указанный язык */
export async function translateMessageInChat(
  auth: AuthState,
  chatId: string,
  messageId: string,
  targetLang: string,
): Promise<{ text: string; targetLang: string }> {
  return api<{ text: string; targetLang: string }>(
    `/chats/${chatId}/messages/${messageId}/translate`,
    {
      method: 'POST',
      body: JSON.stringify({ targetLang }),
    },
    auth.tokens.accessToken,
  );
}

/** Список чатов для текущего пользователя */
export async function listChatsForUser(
  auth: AuthState,
  dealId?: string,
): Promise<ChatDto[]> {
  const params = dealId ? `?dealId=${dealId}` : '';
  return api<ChatDto[]>(`/chats${params}`, {}, auth.tokens.accessToken);
}