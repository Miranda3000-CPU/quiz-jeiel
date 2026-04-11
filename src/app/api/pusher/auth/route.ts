import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';
import Pusher from 'pusher';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const data = await request.formData();
  const socketId = data.get('socket_id') as string;
  const channel = data.get('channel_name') as string;
  
  // Tenta pegar o nome de várias fontes (formData ou query param)
  const guestName = data.get('name') as string || url.searchParams.get('name') as string;

  const token = (await cookies()).get('auth_token')?.value;
  let user = null;
  if (token) {
    user = verifyToken(token);
  }

  const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
  });

  const name = user ? user.username : (guestName || 'Convidado');
  const isGuest = !user;

  const presenceData = {
    user_id: user ? `user-${user.userId}` : `guest-${Math.random().toString(36).slice(2)}`,
    user_info: { 
      name,
      isGuest,
      isLogged: !!user
    },
  };

  const authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData);
  return NextResponse.json(authResponse);
}
