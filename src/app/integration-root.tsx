import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ApolloClient } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { closeBffSession, createBffClient } from './bff-client'
import { createIdentityApi, identityError, sessionExpired, type Identity } from './auth-api'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

export default function IntegrationRoot() {
  const [client, setClient] = useState(createBffClient)
  const [generation, setGeneration] = useState(0)
  async function close() {
    await closeBffSession(client)
    setClient(createBffClient())
    setGeneration(value => value + 1)
  }
  return <ApolloProvider client={client}>
    <IdentitySession key={generation} client={client} onClose={close} />
  </ApolloProvider>
}

function IdentitySession({ client, onClose }: { client: ApolloClient; onClose: () => Promise<void> }) {
  const api = useMemo(() => createIdentityApi(client), [client])
  const [account, setAccount] = useState<Identity | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [zone, setZone] = useState('America/Santiago')
  const [maximum, setMaximum] = useState('3000')
  const [frequency, setFrequency] = useState('3')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const accept = useCallback((value: Identity | null) => {
    setAccount(value)
    if (value) { setName(value.profile.displayName); setZone(value.preferences.timeZone); setMaximum(value.preferences.microExpenseMaximumAmount); setFrequency(String(value.preferences.microExpenseMinimumCount)) }
  }, [])
  useEffect(() => {
    let active = true
    void api.read().then(value => { if (active) { accept(value); setError('') } }, failure => { if (active) setError(identityError(failure)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, attempt, accept])
  async function perform(action: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (failure) {
      setError(identityError(failure))
      if (account && sessionExpired(failure)) { await onClose() }
    } finally { setBusy(false); setPassword('') }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    void perform(async () => {
      if (mode === 'register') { await api.register(email, password, name); setMode('login'); setNotice('Cuenta creada. Inicia sesión para continuar.') }
      else accept(await api.login(email, password))
    })
  }
  return <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col justify-center gap-5 px-4 py-10" aria-labelledby="identity-title">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-primary">Billetera Virtual</p><h1 id="identity-title" className="mt-1 text-2xl font-extrabold">{account ? 'Mi cuenta' : mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</h1></div>
      {account && <Button variant="outline" disabled={busy || loading} onClick={() => { void perform(async () => { await api.logout(); await onClose() }) }}>Cerrar sesión</Button>}
    </header>
    {error && <div role="alert" className="rounded-xl border border-danger/40 bg-card p-4 text-sm">{error} <Button variant="ghost" disabled={busy || loading} onClick={() => { setLoading(true); setAttempt(value => value + 1) }}>Volver a consultar</Button></div>}
    {notice && <p role="status" className="rounded-xl border border-primary/30 p-4 text-sm">{notice}</p>}
    {loading ? <p role="status">Comprobando sesión…</p> : !account ? <section className="panel w-full max-w-md p-5 sm:p-6">
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && <Field label="Nombre">{id => <Input id={id} value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={60} required disabled={busy} />}</Field>}
        <Field label="Correo electrónico">{id => <Input id={id} type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" maxLength={254} required disabled={busy} />}</Field>
        <Field label="Contraseña">{id => <Input id={id} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 15 : undefined} maxLength={128} required disabled={busy} />}</Field>
        {mode === 'register' && <p className="text-xs text-muted-foreground">Usa entre 15 y 128 caracteres. Puedes incluir espacios.</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Procesando…' : mode === 'register' ? 'Crear cuenta' : 'Entrar'}</Button>
        <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => { setMode(value => value === 'login' ? 'register' : 'login'); setPassword(''); setError(''); setNotice('') }}>{mode === 'register' ? 'Ya tengo cuenta' : 'Registrarme'}</Button>
      </form>
    </section> : <div className="grid gap-5 md:grid-cols-2">
      <section className="panel space-y-4 p-5 sm:p-6" aria-labelledby="profile-title">
        <div><h2 id="profile-title" className="text-lg font-bold">Perfil</h2><p className="mt-1 break-all text-sm text-muted-foreground">{account.profile.email}</p></div>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); void perform(async () => { const updated = await api.profile(name, account.profile.version); setAccount(value => value ? { ...value, profile: updated } : value); setName(updated.displayName); setNotice('Perfil guardado.') }) }}>
          <Field label="Nombre del perfil">{id => <Input id={id} value={name} onChange={event => setName(event.target.value)} maxLength={60} required disabled={busy} />}</Field>
          <Button type="submit" disabled={busy}>Guardar perfil</Button>
        </form>
      </section>
      <section className="panel space-y-4 p-5 sm:p-6" aria-labelledby="preferences-title">
        <div><h2 id="preferences-title" className="text-lg font-bold">Preferencias</h2><p className="mt-1 text-sm text-muted-foreground">Moneda: peso chileno (CLP)</p></div>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); void perform(async () => { const updated = await api.preferences({ ...account.preferences, timeZone: zone, microExpenseMaximumAmount: maximum, microExpenseMinimumCount: Number(frequency) }); setAccount(value => value ? { ...value, preferences: updated } : value); setNotice('Preferencias guardadas.') }) }}>
          <Field label="Zona horaria">{id => <Input id={id} value={zone} onChange={event => setZone(event.target.value)} placeholder="America/Santiago" required disabled={busy} />}</Field>
          <Field label="Monto máximo de gastos hormiga (CLP)">{id => <Input id={id} inputMode="numeric" pattern="[1-9][0-9]*" value={maximum} onChange={event => setMaximum(event.target.value)} required disabled={busy} />}</Field>
          <Field label="Frecuencia mínima mensual">{id => <Input id={id} type="number" min={1} max={2147483647} step={1} value={frequency} onChange={event => setFrequency(event.target.value)} required disabled={busy} />}</Field>
          <Button type="submit" disabled={busy}>Guardar preferencias</Button>
        </form>
      </section>
      <p className="text-sm text-muted-foreground md:col-span-2">Las funciones financieras se incorporarán al conectar sus servicios.</p>
    </div>}
  </main>
}
