import Head from 'next/head';
import { Button, Col, Container, Nav, Navbar, Row } from 'react-bootstrap';
import AccordionFAQ from '../components/home/accordion';
import WalletSelector from '../components/home/WalletSelector';
import { authenticate } from "../services/auth";
import styles from "../styles/Home.module.css";

export default function Home() {

  const title = "Ballot.gg - Decentralized Voting for Web3 Communities";
  const description = "Empower your DAO, NFT, or DeFi community with transparent, token-based voting on the Bitcoin-secured Stacks blockchain.";
  const keywords = "decentralized polls, polls on chain, decentralized voting system, voting, ballot box, blockchain voting, blockchain poll, voting system, poll system, DAO governance, token based voting";
  const metaImage = "https://ballot.gg/images/ballot-meta.png";
  const link = "https://ballot.gg/";
  const twitterHandle = "@ballot_gg";

  return (
    <>
      <Head>
        <title>{title}</title>

        <meta
          name="description"
          content={description}
        />
        <meta
          name="keywords"
          content={keywords}
        />
        <meta name="robots" content="index,follow" />

        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

        {/* Facebook Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={link} />
        <meta property="og:image" content={metaImage} />
        <meta property="og:site_name" content="ballot.gg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:url" content={link} />
        <meta name="twitter:image" content={metaImage} />
        {/* <meta name="twitter:site" content={twitterHandle} /> */}

        <meta name="theme-color" content="#000000" />
      </Head>

      {/* Nav bar - Modern */}
      <Navbar expand="lg" className={styles.navbar_modern}>
        <Container>
          <Navbar.Brand href="/" className={styles.navbar_brand}>
            <svg width="68" height="19" viewBox="0 0 68 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.16 9.408C11.104 9.584 11.88 10.056 12.488 10.824C13.096 11.592 13.4 12.472 13.4 13.464C13.4 14.36 13.176 15.152 12.728 15.84C12.296 16.512 11.664 17.04 10.832 17.424C10 17.808 9.016 18 7.88 18H0.656V1.248H7.568C8.704 1.248 9.68 1.432 10.496 1.8C11.328 2.168 11.952 2.68 12.368 3.336C12.8 3.992 13.016 4.736 13.016 5.568C13.016 6.544 12.752 7.36 12.224 8.016C11.712 8.672 11.024 9.136 10.16 9.408ZM4.016 8.16H7.088C7.888 8.16 8.504 7.984 8.936 7.632C9.368 7.264 9.584 6.744 9.584 6.072C9.584 5.4 9.368 4.88 8.936 4.512C8.504 4.144 7.888 3.96 7.088 3.96H4.016V8.16ZM7.4 15.264C8.216 15.264 8.848 15.072 9.296 14.688C9.76 14.304 9.992 13.76 9.992 13.056C9.992 12.336 9.752 11.776 9.272 11.376C8.792 10.96 8.144 10.752 7.328 10.752H4.016V15.264H7.4ZM15.2139 11.304C15.2139 9.96 15.4779 8.768 16.0059 7.728C16.5499 6.688 17.2779 5.888 18.1899 5.328C19.1179 4.768 20.1499 4.488 21.2859 4.488C22.2779 4.488 23.1419 4.688 23.8779 5.088C24.6299 5.488 25.2299 5.992 25.6779 6.6V4.704H29.0619V18H25.6779V16.056C25.2459 16.68 24.6459 17.2 23.8779 17.616C23.1259 18.016 22.2539 18.216 21.2619 18.216C20.1419 18.216 19.1179 17.928 18.1899 17.352C17.2779 16.776 16.5499 15.968 16.0059 14.928C15.4779 13.872 15.2139 12.664 15.2139 11.304ZM25.6779 11.352C25.6779 10.536 25.5179 9.84 25.1979 9.264C24.8779 8.672 24.4459 8.224 23.9019 7.92C23.3579 7.6 22.7739 7.44 22.1499 7.44C21.5259 7.44 20.9499 7.592 20.4219 7.896C19.8939 8.2 19.4619 8.648 19.1259 9.24C18.8059 9.816 18.6459 10.504 18.6459 11.304C18.6459 12.104 18.8059 12.808 19.1259 13.416C19.4619 14.008 19.8939 14.464 20.4219 14.784C20.9659 15.104 21.5419 15.264 22.1499 15.264C22.7739 15.264 23.3579 15.112 23.9019 14.808C24.4459 14.488 24.8779 14.04 25.1979 13.464C25.5179 12.872 25.6779 12.168 25.6779 11.352ZM35.7035 0.24V18H32.3435V0.24H35.7035ZM42.3832 0.24V18H39.0232V0.24H42.3832ZM51.6069 18.216C50.3269 18.216 49.1749 17.936 48.1509 17.376C47.1269 16.8 46.3189 15.992 45.7269 14.952C45.1509 13.912 44.8629 12.712 44.8629 11.352C44.8629 9.992 45.1589 8.792 45.7509 7.752C46.3589 6.712 47.1829 5.912 48.2229 5.352C49.2629 4.776 50.4229 4.488 51.7029 4.488C52.9829 4.488 54.1429 4.776 55.1829 5.352C56.2229 5.912 57.0389 6.712 57.6309 7.752C58.2389 8.792 58.5429 9.992 58.5429 11.352C58.5429 12.712 58.2309 13.912 57.6069 14.952C56.9989 15.992 56.1669 16.8 55.1109 17.376C54.0709 17.936 52.9029 18.216 51.6069 18.216ZM51.6069 15.288C52.2149 15.288 52.7829 15.144 53.3109 14.856C53.8549 14.552 54.2869 14.104 54.6069 13.512C54.9269 12.92 55.0869 12.2 55.0869 11.352C55.0869 10.088 54.7509 9.12 54.0789 8.448C53.4229 7.76 52.6149 7.416 51.6549 7.416C50.6949 7.416 49.8869 7.76 49.2309 8.448C48.5909 9.12 48.2709 10.088 48.2709 11.352C48.2709 12.616 48.5829 13.592 49.2069 14.28C49.8469 14.952 50.6469 15.288 51.6069 15.288ZM64.9196 7.464V13.896C64.9196 14.344 65.0236 14.672 65.2316 14.88C65.4556 15.072 65.8236 15.168 66.3356 15.168H67.8956V18H65.7836C62.9516 18 61.5356 16.624 61.5356 13.872V7.464H59.9516V4.704H61.5356V1.416H64.9196V4.704H67.8956V7.464H64.9196Z" fill="black" />
            </svg>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="navbarScroll" className={styles.navbar_toggle} />
          <Navbar.Collapse id="navbarScroll">
            <Nav className="me-auto"></Nav>
            <Nav className={styles.navbar_nav}>
              <Nav.Link href="#how-it-works" className={styles.nav_link}>How it works</Nav.Link>
              <Nav.Link href="#faq" className={styles.nav_link}>FAQ</Nav.Link>
              <Nav.Link onClick={() => { authenticate() }} className={styles.nav_link}>Log in</Nav.Link>
              <Button className={`btn_big ${styles.nav_cta}`} variant="dark" onClick={() => { authenticate() }}>Create a poll</Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Row>
          <Col md={12}>

            {/* Hero section - Modern */}
            <header className={styles.hero_modern + " " + styles.home_section}>
              <div className={styles.hero_bg} />
              <div className="row">
                <div className="col-12">
                  <div className={styles.hero_content}>
                    <div className={styles.hero_eyebrow}>Secured by Bitcoin · Built on Stacks</div>
                    <h1 className={styles.hero_title}>Govern together with trustless, token-based voting.</h1>
                    <p className={styles.hero_subtitle}>
                      Ballot.gg powers community decisions for DAOs, NFT communities, and DeFi projects—
                      transparent, verifiable, and on‑chain. Vote with Leather, Xverse, or Asigna.
                    </p>
                    <div className={styles.hero_actions}>
                      <Button className='btn_big' variant="dark" onClick={() => { authenticate() }}>
                        Create a poll
                      </Button>
                      <a className={styles.hero_secondary_cta} href="#how-it-works">See how it works</a>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Features */}
            <section className={styles.home_section}>
              <div className={styles.section_header}>
                <h2 className={styles.section_title}>Why Ballot.gg</h2>
                <p className={styles.section_subtitle}>A governance toolkit that’s simple for voters and powerful for admins.</p>
              </div>
              <div className="row g-4">
                <div className="col-md-6 col-lg-3">
                  <div className={styles.feature_card}>
                    <div className={styles.feature_icon}>🔐</div>
                    <h3 className={styles.feature_title}>Token-Based Voting</h3>
                    <p className={styles.feature_desc}>Gate polls by FT (STX, ALEX & more) and NFT (CrashPunks, BlockSurvey & more) to ensure only your community decides.</p>
                  </div>
                </div>
                <div className="col-md-6 col-lg-3">
                  <div className={styles.feature_card}>
                    <div className={styles.feature_icon}>⚖️</div>
                    <h3 className={styles.feature_title}>Multiple Systems</h3>
                    <p className={styles.feature_desc}>First-past-the-post, Block Voting, Quadratic, and Weighted voting systems out of the box.</p>
                  </div>
                </div>
                <div className="col-md-6 col-lg-3">
                  <div className={styles.feature_card}>
                    <div className={styles.feature_icon}>⛓️</div>
                    <h3 className={styles.feature_title}>On‑chain & Verifiable</h3>
                    <p className={styles.feature_desc}>Built on Stacks, secured by Bitcoin. Every vote is transparent and auditable.</p>
                  </div>
                </div>
                <div className="col-md-6 col-lg-3">
                  <div className={styles.feature_card}>
                    <div className={styles.feature_icon}>⚡</div>
                    <h3 className={styles.feature_title}>Fast to Launch</h3>
                    <p className={styles.feature_desc}>Spin up a poll in minutes. Share a link and start collecting votes instantly.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Wallet Selector */}
            <WalletSelector />

            {/* Stats / Social proof */}
            <section className={styles.stats_section + " " + styles.home_section}>
              <div className="row g-4">
                <div className="col-6 col-md-3">
                  <div className={styles.stat_card}><div className={styles.stat_value}>10K+</div><div className={styles.stat_label}>Votes Cast</div></div>
                </div>
                <div className="col-6 col-md-3">
                  <div className={styles.stat_card}><div className={styles.stat_value}>500+</div><div className={styles.stat_label}>Polls Created</div></div>
                </div>
                <div className="col-6 col-md-3">
                  <div className={styles.stat_card}><div className={styles.stat_value}>50+</div><div className={styles.stat_label}>Communities</div></div>
                </div>
                <div className="col-6 col-md-3">
                  <div className={styles.stat_card}><div className={styles.stat_value}>100%</div><div className={styles.stat_label}>Transparent</div></div>
                </div>
              </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className={styles.how_it_works_section + " " + styles.home_section}>
              <div className={styles.section_header}>
                <h2 className={styles.section_title}>How it works</h2>
                <p className={styles.section_subtitle}>Powered by Stacks (Ӿ), secured by ₿itcoin.</p>
              </div>

              {/* Steps */}
              <div className='row'>
                <div className='col-md-12'>
                  {/* Step 1 */}
                  <div style={{ marginBottom: "20px" }} className={styles.how_it_works_step_box}>
                    <div>
                      {/* Image */}
                      <div className={styles.how_it_works_step_image}>
                        <svg width="50" height="37" viewBox="0 0 50 37" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12.3212 0H37.6811H37.6838V0.00416054L50 18.2762L37.6838 36.5482V36.5522H37.6811H12.3212V0ZM12.319 36.5541L0 18.2779L12.319 0.00185295V36.5541ZM34.057 14.9375H28.6419L32.4448 9.13699H29.5698L24.9914 16.1344L20.428 9.13699H17.5532L21.3559 14.9375H15.9408V17.1779H34.057V14.9375ZM28.5355 21.536L32.3839 27.4132H29.5091L24.9914 20.5078L20.4737 27.4132H17.6141L21.4625 21.5512H15.9408V19.3261H34.057V21.536H28.5355Z" fill="#242629" />
                        </svg>
                      </div>

                      {/* Text */}
                      <h3 className={styles.how_it_works_step_title}>
                        Connect your Stacks wallet (Leather Wallet, Xverse, or Asigna) to get started.
                      </h3>
                    </div>

                    {/* Number */}
                    <div className={styles.how_it_works_step_number}>
                      <svg width="37" height="95" viewBox="0 0 37 95" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0.51 20.77V0.0999975H36.52V95H13.38V20.77H0.51Z" fill="#ECEFF1" />
                      </svg>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div style={{ marginBottom: "20px" }} className={styles.how_it_works_step_box}>
                    {/* Image */}
                    <div className={styles.how_it_works_step_image}>
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M35 5C35.92 5 36.6667 5.74667 36.6667 6.66667V30C36.6667 30.92 35.92 31.6667 35 31.6667H10.7583L3.33333 37.5V6.66667C3.33333 5.74667 4.07999 5 4.99999 5H35ZM21.6667 12.1111C21.6667 11.8656 21.4677 11.6667 21.2222 11.6667H18.7778C18.5323 11.6667 18.3333 11.8656 18.3333 12.1111V24.5556C18.3333 24.801 18.5323 25 18.7778 25H21.2222C21.4677 25 21.6667 24.801 21.6667 24.5556V12.1111ZM28.3333 15.4444C28.3333 15.199 28.1343 15 27.8889 15H25.4444C25.199 15 25 15.199 25 15.4444V24.5556C25 24.801 25.199 25 25.4444 25H27.8889C28.1343 25 28.3333 24.801 28.3333 24.5556V15.4444ZM15 18.7778C15 18.5323 14.801 18.3333 14.5555 18.3333H12.1111C11.8656 18.3333 11.6667 18.5323 11.6667 18.7778V24.5556C11.6667 24.801 11.8656 25 12.1111 25H14.5555C14.801 25 15 24.801 15 24.5556V18.7778Z" fill="black" />
                      </svg>
                    </div>

                    {/* Text */}
                    <h3 className={styles.how_it_works_step_title}>
                      Add your question with options and select your community to create a poll.
                    </h3>

                    {/* Number */}
                    <div className={styles.how_it_works_step_number}>
                      <svg width="67" height="96" viewBox="0 0 67 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.07 79.19C4.01667 76.85 5.36 75.7667 5.1 75.94C13.5933 68.92 20.2667 63.1567 25.12 58.65C30.06 54.1433 34.22 49.42 37.6 44.48C40.98 39.54 42.67 34.73 42.67 30.05C42.67 26.4967 41.8467 23.7233 40.2 21.73C38.5533 19.7367 36.0833 18.74 32.79 18.74C29.4967 18.74 26.8967 19.9967 24.99 22.51C23.17 24.9367 22.26 28.4033 22.26 32.91H0.81C0.983333 25.5433 2.54333 19.39 5.49 14.45C8.52333 9.51 12.4667 5.87 17.32 3.52999C22.26 1.18999 27.72 0.0199933 33.7 0.0199933C44.0133 0.0199933 51.77 2.66333 56.97 7.94999C62.2567 13.2367 64.9 20.1267 64.9 28.62C64.9 37.8933 61.7367 46.5167 55.41 54.49C49.0833 62.3767 41.0233 70.09 31.23 77.63H66.33V95.7H1.07V79.19Z" fill="#ECEFF1" />
                      </svg>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ marginBottom: "20px" }} className={styles.how_it_works_step_box}>
                    {/* Image */}
                    <div className={styles.how_it_works_step_image}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M31.2973 6.11703C29.1691 6.11703 27.4377 7.8489 27.4377 9.97761C27.4377 10.3002 27.478 10.6135 27.5529 10.9133L21.3371 13.7497C20.6439 12.7171 19.466 12.0361 18.1321 12.0361C17.1466 12.0361 16.2466 12.4082 15.5639 13.0187L8.02843 7.95711C8.40713 7.35995 8.62749 6.65275 8.62749 5.89464C8.62749 3.76593 6.8964 2.03406 4.76867 2.03406C2.64094 2.03406 0.909851 3.76593 0.909851 5.89464C0.909851 8.02377 2.64094 9.75599 4.76867 9.75599C5.93705 9.75599 6.98499 9.233 7.69318 8.4095L15.1669 13.4296C14.6093 14.0993 14.2733 14.9598 14.2733 15.8976C14.2733 18.024 16.0044 19.754 18.1321 19.754C20.2598 19.754 21.9909 18.024 21.9909 15.8976C21.9909 15.3048 21.8564 14.7429 21.6169 14.2405L27.7304 11.4507C28.3103 12.8507 29.6905 13.8383 31.2974 13.8383C33.4252 13.8383 35.1563 12.1065 35.1563 9.97775C35.1563 7.84904 33.4251 6.11703 31.2973 6.11703Z" fill="black" />
                        <path d="M6.99322 11.6554H2.53984C2.38452 11.6554 2.25859 11.7813 2.25859 11.9366V33.7521C2.25859 33.9074 2.38452 34.0333 2.53984 34.0333H6.99322C7.14854 34.0333 7.27447 33.9074 7.27447 33.7521V11.9366C7.27447 11.7813 7.14854 11.6554 6.99322 11.6554Z" fill="black" />
                        <path d="M33.5211 15.7384H29.0687C28.9133 15.7384 28.7874 15.8643 28.7874 16.0197V33.752C28.7874 33.9073 28.9133 34.0332 29.0687 34.0332H33.5211C33.6765 34.0332 33.8024 33.9073 33.8024 33.752V16.0197C33.8024 15.8643 33.6765 15.7384 33.5211 15.7384Z" fill="black" />
                        <path d="M20.3608 21.6582H15.9074C15.752 21.6582 15.6261 21.7841 15.6261 21.9395V33.752C15.6261 33.9073 15.752 34.0332 15.9074 34.0332H20.3608C20.5161 34.0332 20.6421 33.9073 20.6421 33.752V21.9395C20.6421 21.7841 20.5161 21.6582 20.3608 21.6582Z" fill="black" />
                      </svg>
                    </div>

                    {/* Text */}
                    <h3 className={styles.how_it_works_step_title}>
                      Collect data from community members by sharing the poll.
                    </h3>

                    {/* Number */}
                    <div className={styles.how_it_works_step_number}>
                      <svg width="67" height="99" viewBox="0 0 67 99" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.63 29.88C1.97667 20.6067 5.01 13.4567 10.73 8.43C16.45 3.40333 24.2067 0.889995 34 0.889995C40.5 0.889995 46.0467 2.01666 50.64 4.27C55.32 6.52333 58.83 9.59999 61.17 13.5C63.5967 17.4 64.81 21.7767 64.81 26.63C64.81 32.35 63.38 37.03 60.52 40.67C57.66 44.2233 54.3233 46.65 50.51 47.95V48.47C55.45 50.1167 59.35 52.8467 62.21 56.66C65.07 60.4733 66.5 65.37 66.5 71.35C66.5 76.7233 65.2433 81.49 62.73 85.65C60.3033 89.7233 56.7067 92.93 51.94 95.27C47.26 97.61 41.67 98.78 35.17 98.78C24.77 98.78 16.45 96.2233 10.21 91.11C4.05667 85.9967 0.806667 78.2833 0.46 67.97H22.04C22.1267 71.7833 23.21 74.8167 25.29 77.07C27.37 79.2367 30.4033 80.32 34.39 80.32C37.77 80.32 40.37 79.3667 42.19 77.46C44.0967 75.4667 45.05 72.8667 45.05 69.66C45.05 65.5 43.7067 62.51 41.02 60.69C38.42 58.7833 34.2167 57.83 28.41 57.83H24.25V39.76H28.41C32.83 39.76 36.3833 39.0233 39.07 37.55C41.8433 35.99 43.23 33.26 43.23 29.36C43.23 26.24 42.3633 23.8133 40.63 22.08C38.8967 20.3467 36.5133 19.48 33.48 19.48C30.1867 19.48 27.7167 20.4767 26.07 22.47C24.51 24.4633 23.6 26.9333 23.34 29.88H1.63Z" fill="#ECEFF1" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className={styles.faq_section + " " + styles.home_section}>
              <div className={styles.section_header}>
                <h2 className={styles.section_title}>Frequently Asked Questions</h2>
                <p className={styles.section_subtitle}>Everything you need to know about Ballot.gg</p>
              </div>

              {/* Accordion component */}
              <div className={styles.faq_container}>
                <AccordionFAQ />
              </div>
            </section>

            {/* Footer - outside container for full width */}
          </Col>
        </Row>
      </Container>

      <footer className={styles.footer}>
        <Container>
          <div className="row g-4">
            <div className="col-md-4">
              <div className={styles.footer_brand}>
                <div className={styles.footer_logo}>Ballot.gg</div>
                <p className={styles.footer_desc}>Decentralized polling for DAOs, NFT communities, and DeFi projects—built on Stacks, secured by Bitcoin.</p>
              </div>
            </div>
            <div className="col-6 col-md-2">
              <div className={styles.footer_col}>
                <div className={styles.footer_title}>Product</div>
                <a className={styles.footer_link} href="#how-it-works">How it works</a>
                <a className={styles.footer_link} href="#">Features</a>
                <a className={styles.footer_link} href="#">Templates</a>
              </div>
            </div>
            <div className="col-6 col-md-2">
              <div className={styles.footer_col}>
                <div className={styles.footer_title}>Developers</div>
                <a className={styles.footer_link} href="https://github.com/BlockSurvey/ballot" target="_blank" rel="noreferrer">GitHub</a>
                <a className={styles.footer_link} href="#">API</a>
              </div>
            </div>
            <div className="col-md-4">
              <div className={styles.footer_col}>
                <div className={styles.footer_title}>Join the community</div>
                <div className={styles.footer_socials}>
                  <a href="https://github.com/BlockSurvey/ballot" target="_blank" rel="noreferrer" className={styles.social_icon} aria-label="GitHub">
                    <svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M7.08554 21.7251C7.08645 21.7095 7.0869 21.6939 7.0869 21.6784C7.0869 21.5584 7.0847 21.3417 7.08184 21.0589C7.07646 20.5278 7.06871 19.7636 7.06871 18.9685C3.41303 19.6414 2.46728 18.0773 2.17628 17.2589C2.0126 16.8406 1.30329 15.5493 0.684912 15.2037C0.175663 14.9309 -0.551836 14.258 0.666724 14.2398C1.81253 14.2216 2.63097 15.2946 2.90378 15.7311C4.21328 17.9318 6.30484 17.3135 7.14146 16.9315C7.26877 15.9858 7.65071 15.3492 8.06902 14.9855C4.83165 14.6217 1.44879 13.3668 1.44879 7.80141C1.44879 6.2191 2.0126 4.9096 2.94016 3.89111C2.79466 3.52736 2.28541 2.03599 3.08566 0.0353652C3.08566 0.0353652 4.30422 -0.346571 7.0869 1.52674C8.2509 1.19936 9.48764 1.03568 10.7244 1.03568C11.9611 1.03568 13.1979 1.19936 14.3619 1.52674C17.1446 -0.364759 18.3631 0.0353652 18.3631 0.0353652C19.1634 2.03599 18.6541 3.52736 18.5086 3.89111C19.4362 4.9096 20 6.20091 20 7.80141C20 13.385 16.5989 14.6217 13.3616 14.9855C13.889 15.4401 14.3437 16.3131 14.3437 17.6772C14.3437 18.9726 14.3356 20.0987 14.3302 20.8518C14.3275 21.2301 14.3255 21.5142 14.3255 21.6784C14.3255 21.6907 14.3258 21.7029 14.3264 21.7153C13.1681 22.035 11.948 22.2059 10.688 22.2059C9.44103 22.2059 8.23313 22.0386 7.08554 21.7251Z" fill="black" />
                    </svg>
                  </a>
                  <a href="https://blocksurvey.io/discord" target="_blank" rel="noreferrer" className={styles.social_icon} aria-label="Discord">
                    <svg width="22" height="17" viewBox="0 0 22 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.6232 1.39277C17.2139 0.746864 15.7166 0.277115 14.1429 0.00113806C14.1136 0.00113806 14.0842 0.00113796 14.0725 0.0363691C13.8787 0.382809 13.6614 0.82907 13.5147 1.18138C11.8118 0.928891 10.1383 0.928891 8.48247 1.18138C8.3298 0.817326 8.11254 0.376937 7.89528 0.0363691C7.87767 0.0128817 7.85418 -0.0047338 7.82482 0.00113806C6.47429 0.271244 4.74797 0.76448 3.36221 1.39277C3.35046 1.39277 3.33872 1.40451 3.33285 1.41626C0.455637 5.70271 -0.307705 9.81301 0.103325 13.9233C0.103325 13.9409 0.115069 13.9644 0.132685 13.982C2.01168 15.3678 3.83196 16.2133 5.62875 16.7594C5.6581 16.7594 5.68746 16.7594 5.70508 16.7359C6.12785 16.1605 6.50365 15.5498 6.83248 14.9039C6.85009 14.8687 6.83248 14.8217 6.79137 14.81C6.20419 14.5751 5.617 14.305 5.07092 13.9879C5.02982 13.9644 5.02394 13.8998 5.07092 13.8705C5.18836 13.7824 5.30579 13.6943 5.41149 13.6062C5.4291 13.5886 5.45846 13.5886 5.48195 13.5945C9.08727 15.2386 12.9979 15.2386 16.521 13.5945C16.5445 13.5827 16.5739 13.5886 16.5915 13.6004C16.7031 13.6943 16.8146 13.7824 16.9321 13.8705C16.9732 13.8998 16.9673 13.9644 16.9321 13.9879C16.386 14.3109 15.8164 14.5751 15.2116 14.81C15.1705 14.8276 15.1529 14.8687 15.1764 14.9098C15.5052 15.5557 15.8869 16.1605 16.292 16.7301C16.3097 16.7536 16.339 16.7653 16.3684 16.7536C18.1652 16.1957 19.9913 15.356 21.8762 13.9762C21.8938 13.9644 21.9055 13.9468 21.9055 13.9174C22.3635 9.16711 21.1363 5.05094 18.6525 1.41038C18.6525 1.39864 18.6349 1.3869 18.6232 1.3869V1.39277ZM7.3492 11.4336C6.23355 11.4336 5.35277 10.4354 5.35277 9.20234C5.35277 7.96925 6.23355 6.97104 7.3492 6.97104C8.46485 6.97104 9.34563 7.96925 9.34563 9.20234C9.34563 10.4354 8.46485 11.4336 7.3492 11.4336ZM14.689 11.4336C13.5734 11.4336 12.6926 10.4354 12.6926 9.20234C12.6926 7.96925 13.5734 6.97104 14.689 6.97104C15.8047 6.97104 16.6855 7.96925 16.6855 9.20234C16.6855 10.4354 15.8047 11.4336 14.689 11.4336Z" fill="black" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.footer_bottom}>© {new Date().getFullYear()} Ballot.gg. All rights reserved.</div>
        </Container>
      </footer>

    </>
  )
}
