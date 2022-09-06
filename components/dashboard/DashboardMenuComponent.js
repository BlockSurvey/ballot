import Link from "next/link";
import { Container, Row, Col, Button } from "react-bootstrap";

export default function DashboardMenuComponent() {

    return (
        <>
            <Container>
                <Row>
                    <Col md={12} style={{ paddingTop: "10px" }}>
                        <h4>Ballot</h4>

                        <div style={{ margin: "10px 0" }}>
                            <Link href="/builder/new">
                                <Button>
                                    + New Poll
                                </Button>
                            </Link>
                        </div>

                        <div>
                            <Link href="/all-polls">
                                <Button>
                                    All Polls
                                </Button>
                            </Link>
                        </div>
                    </Col>
                </Row>
            </Container>
        </>
    );
}