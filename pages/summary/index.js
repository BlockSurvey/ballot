import { Col, Container, Row } from "react-bootstrap";
import { DashboardNavBarComponent } from "../../components/common/DashboardNavBarComponent";
import SummaryBuilderComponent from "../../components/summary/BuilderComponent";

export default function SummaryBuilder() {
    // Design
    return (
        <>
            {/* Outer layer */}
            <Container className="ballot_container">
                <Row>
                    <Col md={12}>
                        {/* Dashboard nav bar */}
                        <DashboardNavBarComponent />

                        {/* Body */}
                        <SummaryBuilderComponent />
                    </Col>
                </Row>
            </Container>
        </>
    );
}