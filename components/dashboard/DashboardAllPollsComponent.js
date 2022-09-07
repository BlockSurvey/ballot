import { useEffect, useState } from "react";
import { Col, Container, Row, Button } from "react-bootstrap";
import styles from "../../styles/Dashboard.module.css";
import { deleteFileToGaia, getFileFromGaia, getUserData, putFileToGaia } from "../../services/auth.js"
import Link from "next/link";
import { convertToDisplayDateFormat } from "../../services/utils";

export default function DashboardAllPollsComponent() {
    // Variables
    const [allPolls, setAllPolls] = useState();
    const [isDeleting, setIsDeleting] = useState(false);

    // Functions
    useEffect(() => {
        getFileFromGaia("pollIndex.json", {}).then(
            (response) => {
                if (response) {
                    setAllPolls(JSON.parse(response));
                }
            },
            (error) => {
                // File does not exit in gaia
                if (error && error.code == "does_not_exist") {
                    setAllPolls({
                        list: [],
                        ref: {}
                    });
                }
            });
    }, []);

    function getEachRow(pollIndexObject) {
        const gaiaAddress = getUserData()?.gaiaHubConfig?.address;

        function deletePoll(deletablePollIndexObject) {
            const index = allPolls?.list?.findIndex(pollId => pollId === deletablePollIndexObject.id);

            if (index >= 0) {
                setIsDeleting(true);

                // Remove from list and ref
                delete allPolls.ref[deletablePollIndexObject?.id];
                allPolls.list.splice(index, 1);

                // Delete poll from gaia
                const promiseList = [];
                promiseList.push(deleteFileToGaia(`${deletablePollIndexObject.id}.json`));
                promiseList.push(putFileToGaia("pollIndex.json", JSON.stringify(allPolls)));
                Promise.all(promiseList).then(results => {
                    // Update on UI
                    setAllPolls({ ...allPolls });

                    setIsDeleting(false);
                })
            }
        }

        return (
            <Link href={pollIndexObject?.status == "draft" ? `/builder/${pollIndexObject.id}/draft` : `/p/${pollIndexObject.id}/${gaiaAddress}`}>
                <div style={{ border: "1px solid black", borderRadius: "4px", padding: "10px", marginBottom: "10px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "10px" }}>
                                {pollIndexObject?.title ? pollIndexObject?.title : "..."}
                            </div>

                            <div style={{ fontSize: "14px", color: "#737373" }}>
                                <span>
                                    Status : {pollIndexObject?.status == "draft" ? "Draft" : "Active"}
                                </span>
                                {', '}
                                <span>
                                    Last Modified : {convertToDisplayDateFormat(pollIndexObject?.updatedAt)}
                                </span>
                            </div>
                        </div>

                        {/* <div>
                            <Button variant="danger" onClick={(event) => { event.stopPropagation(); deletePoll(pollIndexObject, setAllPolls) }}
                                disabled={isDeleting}>
                                Delete
                            </Button>
                        </div> */}
                    </div>
                </div>
            </Link>
        )
    }

    // Design
    return (
        <>
            <div className={styles.dashboard_container}>
                {/* Title */}
                <h5>All Polls</h5>

                {/* List of all polls */}
                <div style={{ padding: "10px 0" }}>
                    {allPolls?.list && allPolls?.ref ?
                        allPolls?.list?.length > 0 ?
                            allPolls?.list.map(
                                (pollId, i) => (
                                    <div key={i}>
                                        {getEachRow(allPolls.ref[pollId])}
                                    </div>
                                )
                            )
                            :
                            <>No data found</>
                        :
                        <>Loading...</>
                    }
                </div>
            </div>
        </>
    );
}