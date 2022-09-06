import { Container, Row, Col } from "react-bootstrap";
import DashboardAllPollsComponent from "../components/dashboard/DashboardAllPollsComponent";
import DashboardMenuComponent from "../components/dashboard/DashboardMenuComponent";
import styles from "../styles/Dashboard.module.css";

export default function Dashboard() {
    // Variables

    // Return
    return (
        <>
            {/* Outer layer */}
            <Container fluid>
                <Row>
                    <Col md={12} className={styles.full_container}>
                        {/* Inner layer */}
                        <div className={styles.dashboard}>
                            {/* Left side */}
                            <div className={"d-none d-md-block " + styles.dashboard_left}>
                                {/* Menu */}
                                <DashboardMenuComponent />
                            </div>

                            {/* Right side */}
                            <div className={styles.dashboard_center}>
                                {/* List of all polls */}
                                <DashboardAllPollsComponent />
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </>
    );
}