import Head from "next/head";
import { Col, Container, Row } from "react-bootstrap";
import { Constants } from "../common/constants";
import SummaryComponent from "../components/summary/SummaryComponent";
import { getStacksAPIPrefix, getStacksAPIHeaders } from "../services/auth";

export default function SummaryPage(props) {
    // Variables
    const { summaryObject, gaiaAddress, allPolls } = props;
    const title = `${summaryObject?.title} | Ballot`;
    const description = summaryObject?.description?.substr(0, 160);
    const metaImage = "https://ballot.gg/images/ballot-meta.png";
    const displayURL = "";

    // Functions

    // Design
    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />

                <meta name="robots" content="index,follow" />

                {/* Favicon */}
                <link rel="icon" href={"/favicon.ico"} />

                {/* Facebook Meta Tags */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={displayURL} />
                <meta property="og:image" content={metaImage} />
                <meta property="og:site_name" content="ballot.gg" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />

                {/* Twitter Meta Tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:url" content={displayURL} />
                <meta name="twitter:image" content={metaImage} />
                {/* <meta name="twitter:site" content="@ballot_gg" /> */}
            </Head>

            {/* Outer layer */}
            <Container className="ballot_container">
                <Row>
                    <Col md={12}>
                        {/* Body */}
                        <SummaryComponent summaryObject={summaryObject} gaiaAddress={gaiaAddress} allPolls={allPolls} />
                    </Col>
                </Row>
            </Container>
        </>
    );
}

// This gets called on every request
export async function getServerSideProps(context) {
    // Get path param
    const { params } = context;
    const { param } = params;
    let summaryObject = null;
    let gaiaAddress = null;
    let allPolls = null;

    // If it is .btc address
    if (param?.toString().endsWith(".btc")) {
        try {
            // Get name details
            const getZoneFileUrl = `${getStacksAPIPrefix()}/v1/names/${param}/zonefile`;
            const response = await fetch(getZoneFileUrl, {
                headers: getStacksAPIHeaders()
            });

            if (!response.ok) {
                console.warn(`Failed to fetch zone file for ${param}: ${response.status} ${response.statusText}`);
                return;
            }

            const zoneFile = await response.json();

            // Get profile details
            if (zoneFile && zoneFile["zonefile"]) {
                const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
                const profileUrl = zoneFile["zonefile"].match(urlRegex)[0];
                const profileResponse = await fetch(profileUrl);

                if (!profileResponse.ok) {
                    console.warn(`Failed to fetch profile from ${profileUrl}: ${profileResponse.status} ${profileResponse.statusText}`);
                    return;
                }

                const profileObject = await profileResponse.json();

                // Get gaia address
                if (profileObject[0]['decodedToken']?.['payload']?.["claim"]?.['apps']?.["https://ballot.gg"]) {
                    const gaiaPrefixUrl = profileObject[0]['decodedToken']?.['payload']?.["claim"]?.['apps']?.["https://ballot.gg"];
                    const splittedArray = gaiaPrefixUrl.split("/");

                    gaiaAddress = splittedArray.pop();
                    while (splittedArray.length > 0 && !gaiaAddress) {
                        gaiaAddress = splittedArray.pop();
                    }
                }
            }
        } catch (error) {
        }
    } else if (param) {
        gaiaAddress = param;
    }

    if (gaiaAddress) {
        // Form gaia url            
        let summaryGaiaUrl = Constants.GAIA_HUB_PREFIX + gaiaAddress + "/summary.json";

        try {
            const response = await fetch(summaryGaiaUrl);
            summaryObject = await response.json();
            allPolls = summaryObject?.polls ? summaryObject?.polls : null;
        } catch (error) {
            // Summary not found
            summaryObject = null;
            allPolls = null;
        }
    }

    // Pass data to the page via props
    return {
        props: {
            summaryObject,
            gaiaAddress,
            allPolls
        },
    };
}