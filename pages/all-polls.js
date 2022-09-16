import { Col, Container, Row } from "react-bootstrap";
import { DashboardNavBarComponent } from "../components/common/DashboardNavBarComponent";
import DashboardAllPollsComponent from "../components/dashboard/DashboardAllPollsComponent";

export default function Dashboard() {
    // Variables

    // Return
    return (
        <>
            {/* Outer layer */}
            <Container className="ballot_container">
                <Row>
                    <Col md={12}>
                        {/* Dashboard nav bar */}
                        <DashboardNavBarComponent />

                        {/* List of all polls */}
                        <DashboardAllPollsComponent />
                    </Col>
                </Row>
            </Container>
        </>
    );
}