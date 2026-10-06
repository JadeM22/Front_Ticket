import { createContext } from 'react'
import type { AuthContextValor } from './AuthContext'

export const AuthContext = createContext<AuthContextValor | null>(null)
