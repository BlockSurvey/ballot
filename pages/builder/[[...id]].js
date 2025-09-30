import { useRouter } from "next/router";
import { Col, Container, Row } from "react-bootstrap";
import BuilderComponent from "../../components/builder/BuilderComponent";
import { DashboardNavBarComponent } from "../../components/common/DashboardNavBarComponent";

export default function Builder() {
    // Variables
    const router = useRouter();
    const pathParams = router.query.id;

    // Return
    return (
        <>
            {/* Dashboard nav bar - Full width */}
            <DashboardNavBarComponent />
            
            {/* Content container */}
            <Container className="ballot_container">
                <Row>
                    <Col md={12}>
                        {/* Body */}
                        <BuilderComponent pathParams={pathParams} />
                    </Col>
                </Row>
            </Container>
        </>
    );
}