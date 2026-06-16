import { useRouter } from "next/router";
import { Col, Container, Row } from "react-bootstrap";
import BuilderComponent from "../../components/builder/BuilderComponent";
import { DashboardNavBarComponent } from "../../components/common/DashboardNavBarComponent";

export default function Builder() {
    // Variables
    const router = useRouter();
    const pathParams = router.query.id;

    // Key the builder by route so navigating between polls (or to a brand-new
    // poll) remounts it with a clean state instead of keeping the previous
    // poll's title/description/options.
    const builderKey = Array.isArray(pathParams) ? pathParams.join("/") : (pathParams || "new");

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
                        <BuilderComponent key={builderKey} pathParams={pathParams} />
                    </Col>
                </Row>
            </Container>
        </>
    );
}