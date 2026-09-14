"use client"

/**
 * PR-06c — MFA enrollment (admin). Only usable with enrollment_token from login.
 * Other admin pages remain blocked until setup completes (session purpose gate on backend).
 */
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function AdminMfaEnrollPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const enrollmentToken = searchParams?.get("token") || ""
  const [code, setCode] = useState("")
  const [qr, setQr] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [error, setError] = useState("")
  const [started, setStarted] = useState(false)

  const backendBase = () =>
    (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:3002").replace(
      /\/$/,
      "",
    )

  const startEnrollment = async () => {
    setError("")
    if (!enrollmentToken) {
      setError("Token de enrollment ausente. Faça login novamente.")
      return
    }
    try {
      const res = await fetch(`${backendBase()}/api/v1/auth/2fa/setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${enrollmentToken}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || "Falha ao iniciar enrollment")
        return
      }
      setQr(json?.data?.qr_code || null)
      setStarted(true)
    } catch {
      setError("Não foi possível iniciar o cadastro MFA.")
    }
  }

  const confirmCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const res = await fetch(`${backendBase()}/api/v1/auth/2fa/verify-setup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${enrollmentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || "Código inválido")
        return
      }
      const codes = json?.data?.backup_codes as string[] | undefined
      setBackupCodes(codes || [])
    } catch {
      setError("Falha ao confirmar TOTP.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">Cadastro MFA (TOTP)</h1>
        <p className="text-sm text-gray-600">
          Obrigatório para admin/manager. Guarde os recovery codes offline — exibidos uma única vez.
        </p>

        {!started && (
          <button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md"
            onClick={startEnrollment}
          >
            Gerar QR
          </button>
        )}

        {qr && (
          <div className="flex flex-col items-center gap-2">
            {/* QR is data URL from backend; alt text for a11y */}
            <img src={qr} alt="QR Code TOTP (mascarar em evidências)" className="w-48 h-48" />
            <form onSubmit={confirmCode} className="w-full space-y-3">
              <label htmlFor="totp" className="block text-sm font-medium text-gray-700">
                Código do autenticador
              </label>
              <input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full border rounded-md px-3 py-2"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md">
                Confirmar e ativar
              </button>
            </form>
          </div>
        )}

        {backupCodes && (
          <div className="space-y-2" role="status">
            <p className="text-sm font-medium">Recovery codes (1× — copie agora):</p>
            <ul className="text-xs font-mono bg-gray-100 p-3 rounded space-y-1">
              {backupCodes.map((c) => (
                <li key={c}>{c.replace(/.(?=.{4})/g, "•")}</li>
              ))}
            </ul>
            <button
              type="button"
              className="w-full border py-2 rounded-md"
              onClick={() => router.replace("/admin/login")}
            >
              Concluir — voltar ao login
            </button>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
