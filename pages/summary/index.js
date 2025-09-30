import { Col, Container, Row } from "react-bootstrap";
import { DashboardNavBarComponent } from "../../components/common/DashboardNavBarComponent";
import SummaryBuilderComponent from "../../components/summary/BuilderComponent";

export default function SummaryBuilder() {
    // Design
    return (
        <>
            {/* Dashboard nav bar - Full width */}
            <DashboardNavBarComponent />
            
            {/* Content container */}
            <Container className="ballot_container">
                <Row>
                    <Col md={12}>
                        {/* Body */}
                        <SummaryBuilderComponent />
                    </Col>
                </Row>
            </Container>
        </>
    );
}