'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { useWeb3Modal as useWeb3ModalOriginal } from '@web3modal/wagmi/react'
import { wagmiConfig } from './wagmi'

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

export const isWeb3ModalEnabled = Boolean(projectId)

let isInitialized = false

export function initWeb3Modal() {
    if (typeof window === 'undefined' || !projectId) {
        return false
    }

    if (isInitialized) {
        return true
    }

    try {
        createWeb3Modal({
            wagmiConfig,
            projectId,
        })
        isInitialized = true
        return true
    } catch (error) {
        // Check if error is because it's already initialized
        const errorMsg = error instanceof Error ? error.message : String(error)
        if (errorMsg.includes('already initialized') || errorMsg.includes('already exists')) {
            isInitialized = true
            return true
        }
        console.warn('Web3Modal initialization error:', error)
        return false
    }
}

// Initialize synchronously on client-side module load
if (typeof window !== 'undefined' && projectId) {
    initWeb3Modal()
}

// Re-export the hook for convenience
export { useWeb3Modal } from '@web3modal/wagmi/react'

