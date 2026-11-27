import { gql, type ApolloClient } from '@apollo/client'
import { CombinedGraphQLErrors } from '@apollo/client/errors'

export interface UserProfile { id: string; email: string; displayName: string; version: string; createdAt: string; updatedAt: string }
export interface UserPreferences { currency: string; timeZone: string; microExpenseMaximumAmount: string; microExpenseMinimumCount: number; version: string; updatedAt: string }
export interface Identity { profile: UserProfile; preferences: UserPreferences }
const profile = 'id email displayName version createdAt updatedAt'
const preferences = 'currency timeZone microExpenseMaximumAmount microExpenseMinimumCount version updatedAt'
const identity = `profile { ${profile} } preferences { ${preferences} }`
const VIEWER = gql`query Identity { viewer { ${profile} } userPreferences { ${preferences} } }`
const REGISTER = gql`mutation Register($email: String!, $password: String!, $displayName: String!) { registerUser(email: $email, password: $password, displayName: $displayName) { ${identity} } }`
const LOGIN = gql`mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { ${identity} } }`
const LOGOUT = gql`mutation Logout { logout }`
const PROFILE = gql`mutation Profile($displayName: String!, $expectedVersion: String!) { updateUserProfile(displayName: $displayName, expectedVersion: $expectedVersion) { ${profile} } }`
const PREFERENCES = gql`mutation Preferences($currency: String!, $timeZone: String!, $microExpenseMaximumAmount: String!, $microExpenseMinimumCount: Int!, $expectedVersion: String!) { updateUserPreferences(currency: $currency, timeZone: $timeZone, microExpenseMaximumAmount: $microExpenseMaximumAmount, microExpenseMinimumCount: $microExpenseMinimumCount, expectedVersion: $expectedVersion) { ${preferences} } }`

export function createIdentityApi(client: ApolloClient) {
  return {
    async read(): Promise<Identity | null> {
      const { data } = await client.query<{ viewer: UserProfile | null; userPreferences: UserPreferences | null }>({ query: VIEWER, fetchPolicy: 'no-cache' })
      return data?.viewer && data.userPreferences ? { profile: data.viewer, preferences: data.userPreferences } : null
    },
    async register(email: string, password: string, displayName: string) {
      await client.mutate({ mutation: REGISTER, variables: { email, password, displayName }, fetchPolicy: 'no-cache' })
    },
    async login(email: string, password: string): Promise<Identity> {
      const { data } = await client.mutate<{ login: Identity }>({ mutation: LOGIN, variables: { email, password }, fetchPolicy: 'no-cache' })
      if (!data?.login) throw new Error('Respuesta incompleta')
      return data.login
    },
    async logout() { await client.mutate({ mutation: LOGOUT, fetchPolicy: 'no-cache' }) },
    async profile(displayName: string, expectedVersion: string) {
      const { data } = await client.mutate<{ updateUserProfile: UserProfile }>({ mutation: PROFILE, variables: { displayName, expectedVersion }, fetchPolicy: 'no-cache' })
      if (!data?.updateUserProfile) throw new Error('Respuesta incompleta')
      return data.updateUserProfile
    },
    async preferences(value: UserPreferences) {
      const { data } = await client.mutate<{ updateUserPreferences: UserPreferences }>({ mutation: PREFERENCES, variables: { currency: value.currency, timeZone: value.timeZone, microExpenseMaximumAmount: value.microExpenseMaximumAmount, microExpenseMinimumCount: value.microExpenseMinimumCount, expectedVersion: value.version }, fetchPolicy: 'no-cache' })
      if (!data?.updateUserPreferences) throw new Error('Respuesta incompleta')
      return data.updateUserPreferences
    },
  }
}
export function sessionExpired(error: unknown) { return CombinedGraphQLErrors.is(error) && error.errors.some(item => item.extensions?.code === 'UNAUTHENTICATED') }
export function identityError(error: unknown) { return CombinedGraphQLErrors.is(error) ? error.errors[0]?.message ?? 'No se pudo completar la operación.' : 'No se pudo conectar con el servicio. Intenta nuevamente.' }
