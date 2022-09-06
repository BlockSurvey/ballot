import { useEffect, useState } from "react";
import { Col, Container, Row, Button } from "react-bootstrap";
import styles from "../../styles/Dashboard.module.css";
import { getFileFromGaia, getUserData } from "../../services/auth.js"
import Link from "next/link";
import { convertToDisplayDateFormat } from "../../common/utils";

export default function DashboardAllPollsComponent() {
    // Variables

    // All polls
    const [allPolls, setAllPolls] = useState();

    // Functions
    useEffect(() => {
        getFileFromGaia("pollIndex.json", {}).then(
            (response) => {
                if (response) {
                    setAllPolls(JSON.parse(response));
                }
            },
            (error) => {
                // File does not exit in gaia
                if (error && error.code == "does_not_exist") {
                    setAllPolls({
                        list: [],
                        ref: {}
                    });
                }
            });
    }, []);

    // Function
    function getEachRow(pollObj) {
        const gaiaAddress = getUserData()?.gaiaHubConfig?.address;

        return (
            <Link href={pollObj?.status == "draft" ? `/builder/${pollObj.id}/draft` : `/p/${pollObj.id}/${gaiaAddress}/results`}>
                <div style={{ border: "1px solid black", borderRadius: "4px", padding: "10px", marginBottom: "10px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                                {pollObj?.title ? pollObj?.title : "..."}
                            </div>

                            <div style={{ fontSize: "14px" }}>
                                <span>
                                    Status : {pollObj?.status == "draft" ? "Draft" : "Active"}
                                </span>
                                {', '}
                                <span>
                                    Last Modified : {convertToDisplayDateFormat(pollObj?.updatedAt)}
                                </span>
                            </div>
                        </div>
                        {/* 
                        <div>
                            {pollObj?.status == "draft" &&
                                <Link href={`/builder/${pollObj.id}/draft`}>
                                    <Button style={{ marginRight: "5px" }}>
                                        Edit
                                    </Button>
                                </Link>
                            }

                            {pollObj?.status == "live" &&
                                <Link href={`/results/${pollObj.ipfsLocation}`}>
                                    <Button style={{ marginRight: "5px" }}>
                                        View
                                    </Button>
                                </Link>
                            }

                            <Button>
                                Preview
                            </Button>
                        </div> */}
                    </div>
                </div>
            </Link>
        )
    }

    // Design
    return (
        <>
            <Container fluid>
                <Row className="justify-content-md-center">
                    <Col lg={8} md={12}>

                        <div className={styles.dashboard_container}>
                            {/* Welcome */}

                            {/* Title */}
                            <h4>All Polls</h4>

                            {/* List of all polls */}
                            <div style={{ padding: "10px 0" }}>
                                {allPolls?.list && allPolls?.ref ?
                                    allPolls?.list?.length > 0 ?
                                        allPolls?.list.map(
                                            (pollId, i) => (
                                                <div key={i}>
                                                    {getEachRow(allPolls.ref[pollId])}
                                                </div>
                                            )
                                        )
                                        :
                                        <>No data found</>
                                    :
                                    <>Loading...</>
                                }
                            </div>
                        </div>

                    </Col>
                </Row>
            </Container>
        </>
    );
}