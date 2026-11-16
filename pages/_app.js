import Head from 'next/head'
import { SSRProvider } from 'react-bootstrap'
import AuthErrorNotice from '../components/common/AuthErrorNotice'
import '../styles/globals.css'
import '../styles/quill-overrides.css'

function MyApp({ Component, pageProps }) {
  return <>
    <SSRProvider>
      {/* Header */}
      <Head>
        {/* Fathom Analytics */}
        <script
          src="https://stay-ethical.ballot.gg/script.js"
          data-site="KIYMABDL" defer
          data-included-domains="ballot.gg" />
      </Head>

      {/* Body */}
      <Component {...pageProps} />

      {/* Wallet sign-in failures (fired by services/auth.js) */}
      <AuthErrorNotice />
    </SSRProvider>
  </>
}

export default MyApp
