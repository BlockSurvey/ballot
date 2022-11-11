
import Link from "next/link";
import { convertToDisplayDateFormat } from "../../services/utils";
import styles from "../../styles/Dashboard.module.css";

export default function SummaryComponent(props) {
    // Variables
    const {
        summaryObject,
        gaiaAddress,
        allPolls } = props;

    // Function
    function getEachRow(pollIndexObject) {
        return (
            <Link href={pollIndexObject?.status == "draft" ? `/builder/${pollIndexObject.id}/draft` : `/${pollIndexObject.id}/${gaiaAddress}`}>
                <div>
                    {/* Title */}
                    <div className="d-flex align-items-center" style={{ marginBottom: "10px", columnGap: "10px", width: "100%" }}>
                        <div className="text-truncate" style={{ fontSize: "18px", fontWeight: 600 }}>
                            {pollIndexObject?.title ? pollIndexObject?.title : "..."}
                        </div>
                        {/* Status */}
                        <div className={pollIndexObject?.status == "draft" ? styles.all_polls_status_box_draft : ((pollIndexObject?.endAt && (new Date(pollIndexObject?.endAt) < new Date()))) ? styles.all_polls_status_box_closed : styles.all_polls_status_box_active}>
                            {
                                pollIndexObject?.status == "draft" ? "Draft" :
                                    ((pollIndexObject?.endAt && (new Date(pollIndexObject?.endAt) < new Date())) ?
                                        "Closed" : "Active")
                            }
                        </div>
                    </div>

                    {/* Description */}
                    {
                        pollIndexObject?.description ?
                            <p className={"text_truncate_2" + ' ' + styles.all_polls_description}>
                                {pollIndexObject?.description ? pollIndexObject?.description : "..."}
                            </p>
                            : <></>
                    }

                    <div style={{ fontSize: "14px", color: "#737373" }}>
                        <span>
                            Last Modified : {convertToDisplayDateFormat(pollIndexObject?.updatedAt)}
                        </span>
                    </div>
                </div>
            </Link>
        )
    }

    // Design
    return (
        <>
            {summaryObject &&
                <section>
                    <div className={styles.dashboard_container}>
                        <div style={{ padding: "10px 0 100px 0", maxWidth: "700px", width: "100%" }}>

                            {/* Title */}
                            <h1 style={{ fontSize: "24px", fontWeight: "600" }}>{summaryObject?.title}</h1>

                            {/* Description */}
                            <div style={{ marginBottom: "24px", whiteSpace: "pre-wrap" }}>
                                <p style={{ lineHeight: "1.7" }}
                                    dangerouslySetInnerHTML={{ __html: summaryObject?.description }}>
                                </p>
                            </div>

                            {/* List of all polls */}
                            {allPolls?.list && allPolls?.ref ?
                                (allPolls?.list?.length > 0) &&
                                <>
                                    {/* List of polls */}
                                    <div className={styles.all_polls_list_outline_box}>
                                        {allPolls?.list.map(
                                            (pollId, i) => (
                                                <div key={i} className={styles.all_polls_list_box}>
                                                    {getEachRow(allPolls.ref[pollId])}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </>
                                :
                                <>
                                    {/* Loading */}
                                    <div style={{ width: "100%", maxWidth: "100px", height: "24px", marginBottom: "40px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                                    <div style={{ width: "100%", height: "110px", marginBottom: "10px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                                    <div style={{ width: "100%", height: "110px", marginBottom: "10px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                                    <div style={{ width: "100%", height: "110px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                                </>
                            }
                        </div>
                    </div>
                </section>
            }
        </>
    );
}