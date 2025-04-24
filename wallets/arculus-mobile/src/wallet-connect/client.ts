import { Wallet, DisconnectOptions } from '@cosmos-kit/core'
import { WCClient } from '@cosmos-kit/walletconnect'
import { EngineTypes } from '@walletconnect/types'
import { State } from '@cosmos-kit/core'

// Custom error types for better error handling
export class ArculusClientError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = 'ArculusClientError'
  }
}

export class StorageError extends ArculusClientError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR')
    this.name = 'StorageError'
  }
}

export class SessionError extends ArculusClientError {
  constructor(message: string) {
    super(message, 'SESSION_ERROR')
    this.name = 'SessionError'
  }
}

export class ArculusClient extends WCClient {
  private connectionTimeout: NodeJS.Timeout | null = null;
  private readonly CONNECTION_TIMEOUT_MS = 30000; // 30 seconds timeout

  constructor(walletInfo: Wallet) {
    super(walletInfo)
  }

  async init() {
    console.log('ArculusClient init method called')
    try {
      // Ensure options are properly set before calling parent init
      if (!this.options) {
        console.log('Setting default WalletConnect options')
        this.options = {
          signClient: {
            projectId: this.wcProjectId,
            metadata: {
              name: 'Arculus Wallet Cosmos Kit',
              description: 'Arculus Wallet Cosmos Kit',
              url: 'https://www.arculus.co',
              icons: ['https://gw.arculus.co/icon/arc64.png'],
            },
            relayUrl: 'wss://relay.walletconnect.com',
          },
        }
      } else if (!this.options.signClient?.relayUrl) {
        // Ensure relayUrl is set even if options exist
        this.options.signClient = {
          ...this.options.signClient,
          relayUrl: 'wss://relay.walletconnect.com',
        }
      }

      // Initialize the sign client if needed
      if (!this.signClient) {
        await this.initSignClient()
      } else {
        // If we already have a client, make sure our sessions are up to date
        this.restoreSessions()
      }

      console.log('ArculusClient initialization complete')
    } catch (error) {
      console.error('Error initializing ArculusClient:', error)
      throw error
    }
  }

  // Reset the client state completely
  async resetClient() {
    try {
      // Clear any existing sessions and pairings
      if (this.signClient) {
        const sessions = this.signClient.session.getAll()
        for (const session of sessions) {
          // Only clear sessions that belong to Arculus
          if (session.peer.metadata.name === 'Arculus Wallet') {
            await this.signClient.session.delete(session.topic, {
              code: 7001,
              message: 'Clear existing Arculus session',
            })
          }
        }

        const pairings = this.signClient.pairing.getAll()
        for (const pairing of pairings) {
          // Only clear pairings that belong to Arculus
          if (pairing.peerMetadata?.name === 'Arculus Wallet') {
            await this.signClient.pairing.delete(pairing.topic, {
              code: 7001,
              message: 'Clear existing Arculus pairing',
            })
          }
        }
      }

      // Clear local storage
      await this.clearBrowserStorage()
    } catch (error) {
      console.error('Error resetting client:', error)
      throw error
    }
  }

  // Force a complete reset of the WalletConnect client
  async forceReset() {
    try {
      // Clear any existing sessions and pairings
      if (this.signClient) {
        const sessions = this.signClient.session.getAll()
        for (const session of sessions) {
          await this.signClient.session.delete(session.topic, {
            code: 7001,
            message: 'Force clear existing session',
          })
        }

        const pairings = this.signClient.pairing.getAll()
        for (const pairing of pairings) {
          await this.signClient.pairing.delete(pairing.topic, {
            code: 7001,
            message: 'Force clear existing pairing',
          })
        }
      }

      // Reset state
      this.setQRState(State.Init)
      this.qrUrl.data = undefined
      this.sessions = []
      this.pairings = []

      // Force a complete reinitialization
      this.signClient = undefined
      this.options = undefined
      await this.init()
    } catch (error) {
      throw error
    }
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private async cleanupPreviousConnection() {
    try {
      // Clear any existing timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout)
        this.connectionTimeout = null
      }

      // Reset QR state rather than doing a full client reset
      this.setQRState(State.Init)
      this.qrUrl.data = undefined

      // We don't clear existing sessions here to allow for reconnection
      // Only clear localStorage for fresh/problematic connections

      // For debugging
      await this.debugWalletConnectStorage()
    } catch (error) {
      throw error
    }
  }

  private async clearBrowserStorage() {
    try {
      this.logger?.debug('Clearing WalletConnect browser storage')

      // Clear all known WalletConnect localStorage keys
      const wcKeys = [
        // Deep link choice
        'WALLETCONNECT_DEEPLINK_CHOICE',
        // Project-specific keys
        `wc@2:client:${this.wcProjectId}//session`,
        `wc@2:client:${this.wcProjectId}//pairing`,
        // Legacy keys
        'walletconnect',
        'WALLETCONNECT_V2_CORE',
        'WALLETCONNECT_V2_CLIENT',
      ]

      // Clear all known keys
      wcKeys.forEach(key => localStorage.removeItem(key))

      // Clear any other WalletConnect related items in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('wc@') ||
          key.startsWith('WALLETCONNECT') ||
          key.includes('walletconnect')
        )) {
          localStorage.removeItem(key)
        }
      }

      // Clear IndexedDB
      try {
        const databases = await window.indexedDB.databases()
        for (const db of databases) {
          if (db.name?.includes('walletconnect') ||
            db.name?.includes('WALLETCONNECT') ||
            db.name?.includes('wc@')) {
            window.indexedDB.deleteDatabase(db.name)
          }
        }
      } catch (error) {
        this.logger?.warn('Failed to clear IndexedDB:', error)
        throw new StorageError('Failed to clear IndexedDB')
      }
    } catch (error) {
      this.logger?.error('Failed to clear browser storage:', error)
      throw new StorageError('Failed to clear browser storage')
    }
  }

  private async debugWalletConnectStorage() {
    console.group('🔍 WalletConnect Storage Debug')
    try {
      // Debug localStorage
      console.group('📦 LocalStorage')
      const localStorageItems: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.includes('wc@')) {
          const value = localStorage.getItem(key)
          localStorageItems[key] = value || ''
        }
      }
      console.table(localStorageItems)
      console.groupEnd()

      // Debug IndexedDB
      console.group('🗄️ IndexedDB')
      await new Promise<void>((resolve) => {
        const request = window.indexedDB.open('WALLET_CONNECT_V2_INDEXED_DB')

        request.onerror = () => {
          console.warn('❌ Error opening IndexedDB')
          resolve()
        }

        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const storeNames = Array.from(db.objectStoreNames)
          console.log('📑 Store Names:', storeNames)

          // Read all stores
          for (const storeName of storeNames) {
            console.group(`Store: ${storeName}`)
            try {
              const tx = db.transaction(storeName, 'readonly')
              const store = tx.objectStore(storeName)
              const request = store.getAll()

              await new Promise<void>((resolve) => {
                request.onsuccess = () => {
                  console.log('Contents:', request.result)
                  resolve()
                }
                request.onerror = () => {
                  console.warn('Error reading store:', storeName)
                  resolve()
                }
              })
            } catch (e) {
              console.warn('Error accessing store:', storeName, e)
            }
            console.groupEnd()
          }

          db.close()
          resolve()
        }
      })
      console.groupEnd()

      // Debug SignClient state if available
      console.group('🔐 SignClient State')
      if (this.signClient) {
        console.log('Sessions:', this.signClient.session.getAll())
        console.log('Pairings:', this.signClient.pairing.getAll())
        console.log('Core:', {
          protocol: this.signClient.protocol,
          metadata: this.signClient.metadata,
        })
      } else {
        console.log('SignClient not initialized')
      }
      console.groupEnd()

    } catch (error) {
      console.error('Error in storage debug:', error)
    }
    console.groupEnd()
  }

  async connect(
    chainIds: string | string[],
    options?: EngineTypes.ConnectParams
  ) {
    console.log('ArculusClient connect method called with chainIds:', chainIds)

    try {
      // Clear any previous connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout)
        this.connectionTimeout = null
      }

      // Make sure the client is initialized
      if (!this.signClient) {
        await this.init()
      }

      // Try to restore existing sessions and check if we have a valid one
      this.restoreSessions()
      const existingSession = this.sessions[0]
      if (existingSession && existingSession.expiry * 1000 > Date.now()) {
        console.log('Using existing session:', existingSession.topic)
        this.setupSessionEventListeners()

        // Let the app know we're ready
        this.setQRState(State.Done)
        return
      }

      // No valid session found, clean up and create a new connection
      await this.cleanupPreviousConnection()

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        console.error('Connection timeout reached')
        this.cleanupPreviousConnection()
        throw new Error('Connection timeout')
      }, this.CONNECTION_TIMEOUT_MS)

      // Format chain IDs with namespace
      const chainIdsWithNS =
        typeof chainIds === 'string'
          ? [`cosmos:${chainIds}`]
          : chainIds.map((chainId) => `cosmos:${chainId}`)

      console.log('Formatted chain IDs with namespace:', chainIdsWithNS)

      // Set QR state to pending
      console.log('Setting QR state to Pending')
      this.setQRState(State.Pending)

      const requiredNamespaces = {
        cosmos: {
          methods: [
            'cosmos_getAccounts',
            'cosmos_signAmino',
            'cosmos_signDirect',
            ...(this.requiredNamespaces?.methods ?? []),
          ],
          chains: chainIdsWithNS,
          events: [
            'chainChanged',
            'accountsChanged',
            ...(this.requiredNamespaces?.events ?? []),
          ],
        },
      }

      console.log('Required namespaces:', JSON.stringify(requiredNamespaces, null, 2))

      let connectResp: any
      try {
        console.log('Attempting WalletConnect connection...')
        this.logger?.debug('Connecting chains:', chainIdsWithNS)

        connectResp = await this.signClient.connect({
          requiredNamespaces,
          ...options,
        })

        console.log('Got connection response:', {
          uri: connectResp.uri ? 'Present' : 'Missing',
          approval: connectResp.approval ? 'Present' : 'Missing'
        })

        this.qrUrl.data = connectResp.uri
        this.logger?.debug('Using QR URI:', connectResp.uri)
        this.setQRState(State.Done)

        if (this.redirect) {
          console.log('Redirecting to app')
          this.openApp()
        }

        console.log('Waiting for session approval')
        const session = await connectResp.approval()
        console.log('Session approved:', {
          topic: session.topic,
          expiry: session.expiry
        })
        this.logger?.debug('Established session:', session)
        this.sessions = [session]

        // Set up event listeners for session events
        this.setupSessionEventListeners()

        // Clear timeout on successful connection
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }

        console.log('Connection successful')
      } catch (error) {
        console.error('Connection error:', error)
        this.logger?.error('Client connect error: ', error)
        await this.cleanupPreviousConnection()
        throw error
      }
    } catch (error) {
      await this.cleanupPreviousConnection()
      throw error
    }
  }

  private setupSessionEventListeners() {
    if (!this.signClient) {
      console.error('Cannot setup session listeners: SignClient not initialized')
      return
    }

    // Remove any existing listeners first to prevent duplicates
    this.signClient.removeAllListeners('session_delete')
    this.signClient.removeAllListeners('session_expire')
    this.signClient.removeAllListeners('session_update')
    this.signClient.removeAllListeners('session_event')

    // Listen for session deletion (wallet disconnects)
    this.signClient.on('session_delete', async (event) => {
      console.log('Session deleted by wallet:', event)
      if ('topic' in event) {
        await this.handleWalletDisconnect(event.topic)
      }
    })

    // Listen for session expiry
    this.signClient.on('session_expire', async (event) => {
      console.log('Session expired:', event)
      if ('topic' in event) {
        await this.handleWalletDisconnect(event.topic)
      }
    })

    // Listen for session update (which might indicate a disconnect)
    this.signClient.on('session_update', async (event) => {
      console.log('Session updated:', event)
      if ('topic' in event) {
        // Check if the update includes namespace changes
        if (event.params?.namespaces === undefined) {
          await this.handleWalletDisconnect(event.topic)
        } else {
          console.log('Session namespace updated')
        }
      }
    })

    // Listen for session events like account changes
    this.signClient.on('session_event', (event) => {
      console.log('Session event received:', event)
      if (event.params?.event?.name === 'accountsChanged') {
        console.log('Accounts changed event received')
        // Emit an event that the dApp can listen for
        this.emitter?.emit('account_changed', event.params.event.data)
      } else if (event.params?.event?.name === 'chainChanged') {
        console.log('Chain changed event received')
        // Emit an event that the dApp can listen for
        this.emitter?.emit('chain_changed', event.params.event.data)
      }
    })

    console.log('Session event listeners setup complete')
  }

  private async handleWalletDisconnect(topic: string) {
    this.logger?.debug('Handling wallet disconnect for topic:', topic)

    // Check if this is our current session
    const currentSession = this.sessions.find(session => session.topic === topic)
    if (currentSession) {
      this.logger?.debug('Current session disconnected, cleaning up...')

      // Remove from our sessions array
      this.sessions = this.sessions.filter(session => session.topic !== topic)

      // Clear the session
      if (this.signClient) {
        try {
          await this.signClient.session.delete(topic, {
            code: 7001,
            message: 'Session disconnected by wallet',
          })
        } catch (error) {
          this.logger?.error('Failed to delete session:', error)
          // Continue with cleanup even if session deletion fails
        }
      }

      // Reset state if we have no more sessions
      if (this.sessions.length === 0) {
        this.setQRState(State.Init)
        this.qrUrl.data = undefined
        this.pairings = []
      }

      // Emit disconnect event to notify the dApp
      this.emitter?.emit('disconnect')
      this.logger?.debug('Emitted disconnect event')
    }
  }

  async disconnect(options?: DisconnectOptions) {
    console.log('ArculusClient disconnect method called')
    try {
      // Clear any existing timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout)
        this.connectionTimeout = null
      }

      if (this.sessions.length > 0) {
        console.log('Disconnecting active sessions')

        // For each active session, properly disconnect
        for (const session of this.sessions) {
          try {
            if (this.signClient) {
              await this.signClient.session.delete(session.topic, {
                code: 6000,
                message: 'User disconnected',
              })
            }
          } catch (error) {
            console.error('Error disconnecting session:', error)
            // Continue with other sessions even if one fails
          }
        }
      }

      // Reset client state completely on disconnect
      await this.forceReset()

      console.log('Disconnect complete')
    } catch (error) {
      console.error('Error during disconnect:', error)
      throw error
    }
  }

  async tryReconnect(chainIds: string | string[]) {
    console.log('Attempting to reconnect with existing session')

    try {
      // Ensure the client is initialized
      if (!this.signClient) {
        await this.init()
      }

      // Restore and check sessions
      this.restoreSessions()

      if (this.sessions.length > 0) {
        console.log('Found existing session, reconnecting')
        this.setupSessionEventListeners()
        this.setQRState(State.Done)
        return true
      }

      console.log('No valid sessions found for reconnection')
      return false
    } catch (error) {
      console.error('Error during reconnection attempt:', error)
      return false
    }
  }

  // Method to manually restore sessions
  restoreSessions() {
    if (typeof this.signClient === 'undefined') {
      console.log('SignClient not initialized for session restoration')
      return
    }

    try {
      this.sessions = this.signClient.session
        .getAll()
        .filter(
          (s) =>
            s.peer.metadata.name === 'Arculus Wallet' &&
            s.expiry * 1000 > Date.now() + 1000
        )
      console.log(`Restored ${this.sessions.length} sessions`)
      this.logger?.debug('RESTORED SESSIONS: ', this.sessions)
    } catch (error) {
      console.error('Error restoring sessions:', error)
      this.sessions = []
    }
  }
}
