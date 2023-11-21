export const ConstantsUtil = {
  FOUR_MINUTES_MS: 240_000,

  TEN_SEC_MS: 10_000,

  ONE_SEC_MS: 1_000,

  RESTRICTED_TIMEZONES: [
    'ASIA/SHANGHAI',
    'ASIA/URUMQI',
    'ASIA/CHONGQING',
    'ASIA/HARBIN',
    'ASIA/KASHGAR',
    'ASIA/MACAU',
    'ASIA/HONG_KONG',
    'ASIA/MACAO',
    'ASIA/BEIJING',
    'ASIA/HARBIN'
  ],

  /**
   * Network name to Coinbase Pay SDK chain name map object
   * @see supported chain names on Coinbase for Pay SDK: https://github.com/coinbase/cbpay-js/blob/d4bda2c05c4d5917c8db6a05476b603546046394/src/types/onramp.ts
   */
  WC_COINBASE_PAY_SDK_CHAIN_NAME_MAP: {
    Ethereum: 'ethereum',
    'Arbitrum One': 'arbitrum',
    Polygon: 'polygon',
    Avalanche: 'avalanche-c-chain',
    'OP Mainnet': 'optimism',
    Celo: 'celo'
  }
}
