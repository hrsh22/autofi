'use client'

import { createConfig, http, type CreateConnectorFn } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

const connectors: CreateConnectorFn[] = (() => {
  const list: CreateConnectorFn[] = [injected({ shimDisconnect: true })]
  if (projectId) {
    list.push(
      walletConnect({
        projectId,
        metadata: {
          name: 'FilBridge Synapse Demo',
          description: 'Demo dApp for the FilBridge SDK',
          url: 'https://autofi.local',
          icons: ['https://avatars.githubusercontent.com/u/102192760?s=200&v=4']
        }
      })
    )
  }
  return list
})()

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  ssr: false,
  transports: {
    [baseSepolia.id]: http()
  }
})


