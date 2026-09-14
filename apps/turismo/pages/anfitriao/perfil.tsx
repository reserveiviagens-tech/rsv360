import Head from 'next/head';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import AnfitriaoRoleGuard from '../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../components/anfitriao/AnfitriaoHostNav';
import { useAuth } from '@/context/AuthContext';
import { AUTH_V1, DEFAULT_API_URL } from '@/lib/auth-v1';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export default function AnfitriaoPerfilPage() {
  const { user, isLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const displayName = user?.full_name ?? user?.name ?? '';
  const email = user?.email ?? '';
  const phone = typeof user?.phone === 'string' ? user.phone.trim() : '';

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!email) {
      setFormError('E-mail da sessão ausente. Faça login novamente.');
      return;
    }
    if (newPassword.length < 8) {
      setFormError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('A confirmação não confere com a nova senha.');
      return;
    }
    if (!/^\d{6}$/.test(totpCode.trim())) {
      setFormError('Informe o código MFA de 6 dígitos.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${DEFAULT_API_URL}${AUTH_V1.CHANGE_PASSWORD}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          current_password: currentPassword,
          new_password: newPassword,
          password_confirmation: confirmPassword,
          totp_code: totpCode.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || body.success === false) {
        setFormError(body.error || body.message || 'Não foi possível alterar a senha.');
        return;
      }
      setFormSuccess(body.message || 'Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTotpCode('');
    } catch {
      setFormError('Falha de rede ao alterar a senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Perfil | Anfitrião</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <main className="mx-auto max-w-2xl px-4 py-6 md:px-6">
          <h1 className="text-2xl font-bold text-slate-900">Perfil do parceiro</h1>
          <p className="mt-1 text-sm text-slate-600">
            Dados mínimos da conta autenticada e troca de senha via MFA.
          </p>

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-500" role="status">
              Carregando perfil…
            </p>
          ) : !user ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              Sessão indisponível. Faça login novamente para ver o perfil.
            </p>
          ) : (
            <>
              <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Conta</h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Nome" value={displayName} />
                  <Field label="E-mail" value={email} />
                  <Field label="Telefone" value={phone || 'Não informado na sessão'} />
                  <Field label="Papel" value={user.role ?? '—'} />
                  <Field
                    label="Status"
                    value={user.is_active === false ? 'Inativo' : 'Ativo'}
                  />
                  <Field
                    label="Último acesso"
                    value={
                      user.last_login
                        ? new Date(user.last_login).toLocaleString('pt-BR')
                        : '—'
                    }
                  />
                </dl>
                <p className="mt-4 text-xs text-slate-500" role="note">
                  Nome, e-mail e telefone da conta são somente leitura nesta tela — não há API
                  pública de edição de perfil. Bio e interesses públicos do anfitrião ficam no
                  editor do anúncio (seção Sobre).
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/anfitriao/unidades"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    prefetch={false}
                  >
                    Editar bio no anúncio
                  </Link>
                  <Link
                    href="/anfitriao"
                    className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
                    prefetch={false}
                  >
                    Voltar ao painel
                  </Link>
                </div>
              </section>

              <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Alterar senha</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Usa <code className="rounded bg-slate-100 px-1">POST /api/v1/auth/change-password</code>{' '}
                  (senha atual + código MFA de 6 dígitos).
                </p>
                <form className="mt-4 space-y-3" onSubmit={onChangePassword} noValidate>
                  <div>
                    <label htmlFor="perfil-current-password" className="block text-sm font-medium text-slate-700">
                      Senha atual
                    </label>
                    <input
                      id="perfil-current-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(ev) => setCurrentPassword(ev.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="perfil-new-password" className="block text-sm font-medium text-slate-700">
                      Nova senha
                    </label>
                    <input
                      id="perfil-new-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(ev) => setNewPassword(ev.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="perfil-confirm-password" className="block text-sm font-medium text-slate-700">
                      Confirmar nova senha
                    </label>
                    <input
                      id="perfil-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(ev) => setConfirmPassword(ev.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="perfil-totp" className="block text-sm font-medium text-slate-700">
                      Código MFA (TOTP)
                    </label>
                    <input
                      id="perfil-totp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      pattern="\d{6}"
                      value={totpCode}
                      onChange={(ev) => setTotpCode(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-widest"
                      aria-describedby="perfil-totp-hint"
                    />
                    <p id="perfil-totp-hint" className="mt-1 text-xs text-slate-500">
                      App autenticador com o TOTP da conta.
                    </p>
                  </div>
                  {formError ? (
                    <p className="text-sm text-red-700" role="alert">
                      {formError}
                    </p>
                  ) : null}
                  {formSuccess ? (
                    <p className="text-sm text-emerald-700" role="status">
                      {formSuccess}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {submitting ? 'Salvando…' : 'Alterar senha'}
                  </button>
                </form>
              </section>
            </>
          )}
        </main>
      </div>
    </AnfitriaoRoleGuard>
  );
}
