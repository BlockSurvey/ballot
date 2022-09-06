import { useRouter } from "next/router";
import { Col, Container, Row } from "react-bootstrap";
import BuilderComponent from "../../components/builder/BuilderComponent";
import DashboardMenuComponent from "../../components/dashboard/DashboardMenuComponent";
import styles from "../../styles/Builder.module.css";

export default function Builder() {
    // Variables
    const router = useRouter();
    const pathParams = router.query.id;

    // Return
    return (
        <>
            {/* Outer layer */}
            <Container fluid>
                <Row>
                    <Col md={12} className={styles.full_container}>
                        {/* Inner layer */}
                        <div className={styles.builder}>
                            {/* Left side */}
                            <div className={"d-none d-md-block " + styles.builder_left}>
                                {/* Menu */}
                                <DashboardMenuComponent />
                            </div>

                            {/* Right side */}
                            <div className={styles.builder_center}>
                                <BuilderComponent pathParams={pathParams} />
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </>
    );
}