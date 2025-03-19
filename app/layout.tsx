import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AssistantProvider } from './context/AssistantContext'
import { ModulesProvider } from './context/ModulesContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Assistant Vocal IA Personnel',
  description: 'Assistant vocal IA personnel avec mémoire à long terme',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ModulesProvider>
          <AssistantProvider>
            {children}
          </AssistantProvider>
        </ModulesProvider>
      </body>
    </html>
  )
} 