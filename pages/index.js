import Head from 'next/head'
import { Container, Row, Col, Button } from 'react-bootstrap'
import styles from '../styles/Home.module.css'
import { authenticate, signOut, userSession } from "../services/auth";
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>Ballot</title>
      </Head>

      <Container fluid>
        <Row>
          <Col md={12}>
            {/* Hero section */}
            <section style={{ textAlign: "center" }}>
              <h1>Welcome to Ballot</h1>

              {/* CTA */}
              {userSession && userSession.isUserSignedIn() ? (
                <>
                  <Link href="/all-polls">
                    <Button>Go to dashboard</Button>
                  </Link>

                  <Button onClick={() => { signOut() }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => { authenticate() }}>Sign in</Button>
                </>
              )}
            </section>

            {/* Next sections */}

          </Col>
        </Row>
      </Container>


    </>
  )
}
