import { prisma } from '@/lib/prisma';
import { hashEmail, hashPassword, comparePassword, signToken, verifyToken } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: { action: string } }
) {
  const { action } = await params;

  try {
    const body = await request.json();

    if (action === 'register') {
      const { username, email, password } = body;
      if (!username || !email || !password) {
        return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
      }

      const emailHash = hashEmail(email);
      const passwordHash = await hashPassword(password);

      // Verificar se username ou emailHash já existem
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { emailHash }]
        }
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Usuário ou e-mail já cadastrado' }, { status: 400 });
      }

      const user = await prisma.user.create({
        data: {
          username,
          emailHash,
          passwordHash,
          ranking: {
            create: {
              score: 0
            }
          }
        }
      });

      const token = signToken({ userId: user.id, username: user.username });
      (await cookies()).set('auth_token', token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7 });

      return NextResponse.json({ message: 'Registrado com sucesso', username: user.username });
    }

    if (action === 'login') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
      }

      const emailHash = hashEmail(email);
      const user = await prisma.user.findUnique({
        where: { emailHash }
      });

      if (!user || !(await comparePassword(password, user.passwordHash))) {
        return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
      }

      const token = signToken({ userId: user.id, username: user.username });
      (await cookies()).set('auth_token', token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7 });

      return NextResponse.json({ message: 'Login realizado com sucesso', username: user.username });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 404 });
  } catch (error) {
    console.error('Erro na API de Auth:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { action: string } }
) {
  const { action } = await params;

  if (action === 'account') {
    try {
      const token = (await cookies()).get('auth_token')?.value;
      if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

      const decoded = verifyToken(token);
      if (!decoded) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });

      // Deletar o usuário (o Ranking será deletado por Cascade devido ao Prisma)
      await prisma.user.delete({
        where: { id: decoded.userId }
      });

      (await cookies()).delete('auth_token');

      return NextResponse.json({ message: 'Conta deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      return NextResponse.json({ error: 'Erro ao deletar conta' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 404 });
}

export async function GET(
  request: Request,
  { params }: { params: { action: string } }
) {
  const { action } = await params;

  if (action === 'me') {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ user: null });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ user: null });

    return NextResponse.json({ user: { username: decoded.username } });
  }

  if (action === 'logout') {
    (await cookies()).delete('auth_token');
    return NextResponse.json({ message: 'Logout realizado' });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 404 });
}
