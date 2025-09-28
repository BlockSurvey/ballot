import { DashboardNavBarComponent } from "../components/common/DashboardNavBarComponent";
import DashboardAllPollsComponent from "../components/dashboard/DashboardAllPollsComponent";
import styles from "../styles/Dashboard.module.css";

export default function Dashboard() {
    return (
        <>
            {/* Navigation */}
            <DashboardNavBarComponent />
            
            {/* Main Dashboard Content */}
            <DashboardAllPollsComponent />
        </>
    );
}
