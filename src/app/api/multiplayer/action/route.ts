import { NextResponse } from 'next/server';
import Pusher from 'pusher';

export async function POST(request: Request) {
  try {
    const pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });

    const { action, roomId, ...data } = await request.json();

    if (action === 'start-game') {
      await pusherServer.trigger(`presence-quiz-${roomId}`, 'game-start', {
        question: data.question,
        timePerQuestion: data.timePerQuestion,
        totalQuestions: data.totalQuestions
      });
    }

    if (action === 'next-question') {
      await pusherServer.trigger(`presence-quiz-${roomId}`, 'next-question', {
        question: data.question,
      });
    }

    if (action === 'on-answer') {
      await pusherServer.trigger(`presence-quiz-${roomId}`, 'on-answer', {});
    }

    if (action === 'score-update') {
      await pusherServer.trigger(`presence-quiz-${roomId}`, 'score-update', {
        id: data.id,
        score: data.score,
      });
    }

    if (action === 'game-over') {
      await pusherServer.trigger(`presence-quiz-${roomId}`, 'game-over', {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Multiplayer action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
