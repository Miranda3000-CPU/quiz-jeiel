import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rankings = await prisma.ranking.findMany({
      orderBy: {
        score: 'desc',
      },
      take: 20,
    });
    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userName, score } = await request.json();
    if (!userName) return NextResponse.json({ error: 'User name is required' }, { status: 400 });

    const ranking = await prisma.ranking.upsert({
      where: { userName },
      update: {
        score: {
          increment: score,
        },
      },
      create: {
        userName,
        score,
      },
    });

    return NextResponse.json(ranking);
  } catch (error) {
    console.error('Error updating ranking:', error);
    return NextResponse.json({ error: 'Failed to update ranking' }, { status: 500 });
  }
}
