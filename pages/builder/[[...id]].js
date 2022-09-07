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
            {/* Outer layer */}
            <Container>
                <Row>
                    <Col md={12}>
                        {/* Dashboard nav bar */}
                        <DashboardNavBarComponent />

                        {/* Body */}
                        <BuilderComponent pathParams={pathParams} />
                    </Col>
                </Row>
            </Container>
        </>
    );
}