import { NextResponse } from 'next/server';
import Pusher from 'pusher';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const socketId = String(data.get('socket_id') || '');
    const channel = String(data.get('channel_name') || '');
    const url = new URL(request.url);
    const rawName = String(data.get('name') || url.searchParams.get('name') || 'Convidado');
    const name = rawName.trim().replace(/[<>\r\n]/g, '').slice(0, 24) || 'Convidado';

    if (!socketId || !channel.startsWith('presence-quiz-')) {
      return NextResponse.json({ error: 'Canal inválido' }, { status: 400 });
    }

    const pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });

    const presenceData = {
      user_id: `guest-${crypto.randomUUID()}`,
      user_info: { name, isGuest: true },
    };
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channel, presenceData));
  } catch {
    return NextResponse.json({ error: 'Não foi possível autorizar a sala' }, { status: 500 });
  }
}
