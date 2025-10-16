import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { getFileFromGaia, getGaiaAddressFromPublicKey } from "../../services/auth.js";
import { convertToDisplayDateFormat } from "../../services/utils";
import styles from "../../styles/Dashboard.module.css";
import ArchiveConfirmationModal from "../common/ArchiveConfirmationModal";
import EditDescriptionModal from "../common/EditDescriptionModal";

// Modern Action Dropdown Component
function ModernActionDropdown({ poll, onEditDescription, onArchive, onEditPoll, isTableView = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen]);

    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleItemClick = (action, e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);

        if (action === 'edit') {
            onEditDescription(poll, e);
        } else if (action === 'archive') {
            onArchive(poll, e);
        } else if (action === 'editPoll') {
            onEditPoll(poll, e);
        }
    };

    const dropdownClass = isTableView
        ? `${styles.table_modern_action_dropdown} ${isOpen ? styles.dropdown_open : ''}`
        : `${styles.modern_action_dropdown} ${isOpen ? styles.dropdown_open : ''}`;

    const buttonClass = isTableView
        ? `${styles.modern_three_dot_button} ${styles.table_modern_three_dot_button}`
        : styles.modern_three_dot_button;

    return (
        <div className={dropdownClass} ref={dropdownRef}>
            <button
                ref={buttonRef}
                className={buttonClass}
                onClick={handleToggle}
                aria-label="Poll actions"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="3" cy="8" r="1.5" fill="currentColor" />
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                    <circle cx="13" cy="8" r="1.5" fill="currentColor" />
                </svg>
            </button>

            <div className={`${styles.modern_dropdown_menu} ${isOpen ? styles.menu_open : ''}`}>
                {poll?.status === "draft" ? (
                    <button
                        className={styles.modern_dropdown_item}
                        onClick={(e) => handleItemClick('editPoll', e)}
                        role="menuitem"
                    >
                        <svg width="18" height="18" viewBox="0 0 494.936 494.936" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g>
                                <path d="M389.844,182.85c-6.743,0-12.21,5.467-12.21,12.21v222.968c0,23.562-19.174,42.735-42.736,42.735H67.157 c-23.562,0-42.736-19.174-42.736-42.735V150.285c0-23.562,19.174-42.735,42.736-42.735h267.741c6.743,0,12.21-5.467,12.21-12.21 s-5.467-12.21-12.21-12.21H67.157C30.126,83.13,0,113.255,0,150.285v267.743c0,37.029,30.126,67.155,67.157,67.155h267.741 c37.03,0,67.156-30.126,67.156-67.155V195.061C402.054,188.318,396.587,182.85,389.844,182.85z" fill="currentColor" />
                                <path d="M483.876,20.791c-14.72-14.72-38.669-14.714-53.377,0L221.352,229.944c-0.28,0.28-3.434,3.559-4.251,5.396l-28.963,65.069 c-2.057,4.619-1.056,10.027,2.521,13.6c2.337,2.336,5.461,3.576,8.639,3.576c1.675,0,3.362-0.346,4.96-1.057l65.07-28.963 c1.83-0.815,5.114-3.97,5.396-4.25L483.876,74.169c7.131-7.131,11.06-16.61,11.06-26.692 C494.936,37.396,491.007,27.915,483.876,20.791z M466.61,56.897L257.457,266.05c-0.035,0.036-0.055,0.078-0.089,0.107 l-33.989,15.131L238.51,247.3c0.03-0.036,0.071-0.055,0.107-0.09L447.765,38.058c5.038-5.039,13.819-5.033,18.846,0.005 c2.518,2.51,3.905,5.855,3.905,9.414C470.516,51.036,469.127,54.38,466.61,56.897z" fill="currentColor" />
                            </g>
                        </svg>
                        Edit Poll
                    </button>
                ) : (
                    <>
                        <button
                            className={styles.modern_dropdown_item}
                            onClick={(e) => handleItemClick('edit', e)}
                            role="menuitem"
                        >
                            <svg width="18" height="18" viewBox="0 0 494.936 494.936" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g>
                                    <path d="M389.844,182.85c-6.743,0-12.21,5.467-12.21,12.21v222.968c0,23.562-19.174,42.735-42.736,42.735H67.157 c-23.562,0-42.736-19.174-42.736-42.735V150.285c0-23.562,19.174-42.735,42.736-42.735h267.741c6.743,0,12.21-5.467,12.21-12.21 s-5.467-12.21-12.21-12.21H67.157C30.126,83.13,0,113.255,0,150.285v267.743c0,37.029,30.126,67.155,67.157,67.155h267.741 c37.03,0,67.156-30.126,67.156-67.155V195.061C402.054,188.318,396.587,182.85,389.844,182.85z" fill="currentColor" />
                                    <path d="M483.876,20.791c-14.72-14.72-38.669-14.714-53.377,0L221.352,229.944c-0.28,0.28-3.434,3.559-4.251,5.396l-28.963,65.069 c-2.057,4.619-1.056,10.027,2.521,13.6c2.337,2.336,5.461,3.576,8.639,3.576c1.675,0,3.362-0.346,4.96-1.057l65.07-28.963 c1.83-0.815,5.114-3.97,5.396-4.25L483.876,74.169c7.131-7.131,11.06-16.61,11.06-26.692 C494.936,37.396,491.007,27.915,483.876,20.791z M466.61,56.897L257.457,266.05c-0.035,0.036-0.055,0.078-0.089,0.107 l-33.989,15.131L238.51,247.3c0.03-0.036,0.071-0.055,0.107-0.09L447.765,38.058c5.038-5.039,13.819-5.033,18.846,0.005 c2.518,2.51,3.905,5.855,3.905,9.414C470.516,51.036,469.127,54.38,466.61,56.897z" fill="currentColor" />
                                </g>
                            </svg>
                            Edit Description
                        </button>

                        <hr className={styles.modern_dropdown_divider} />

                        <button
                            className={`${styles.modern_dropdown_item} ${styles.item_danger}`}
                            onClick={(e) => handleItemClick('archive', e)}
                            role="menuitem"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M2 4h12l-1.5 9H3.5L2 4zm2.5 0V2.5C4.5 2.224 4.724 2 5 2h6c.276 0 .5.224.5.5V4M6 6.5v5M10 6.5v5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                            </svg>
                            Archive Poll
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function DashboardAllPollsComponent() {
    // localStorage utility functions
    const getDashboardPreferences = () => {
        if (typeof window === 'undefined') return null;
        try {
            const prefs = localStorage.getItem('ballot_dashboard_preferences');
            return prefs ? JSON.parse(prefs) : null;
        } catch (error) {
            console.warn('Failed to load dashboard preferences from localStorage:', error);
            return null;
        }
    };

    const saveDashboardPreferences = (preferences) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('ballot_dashboard_preferences', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to save dashboard preferences to localStorage:', error);
        }
    };

    // Load saved preferences or use defaults
    const savedPreferences = getDashboardPreferences();

    // Variables
    const [allPolls, setAllPolls] = useState();
    const [isDeleting, setIsDeleting] = useState(false);
    const [gaiaAddress, setGaiaAddress] = useState();
    const [searchQuery, setSearchQuery] = useState(savedPreferences?.searchQuery || "");
    const [statusFilter, setStatusFilter] = useState(savedPreferences?.statusFilter || "all");
    const [sortBy, setSortBy] = useState(savedPreferences?.sortBy || "date");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [viewMode, setViewMode] = useState(savedPreferences?.viewMode || "grid"); // "grid" or "list"

    // Edit description modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedPoll, setSelectedPoll] = useState(null);

    // Archive confirmation modal state
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [pollToArchive, setPollToArchive] = useState(null);


    // Functions
    useEffect(() => {
        getGaiaAddress();

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

    // Save preferences to localStorage whenever they change
    useEffect(() => {
        const preferences = {
            searchQuery,
            statusFilter,
            sortBy,
            viewMode
        };
        saveDashboardPreferences(preferences);
    }, [searchQuery, statusFilter, sortBy, viewMode]);

    async function getGaiaAddress() {
        const _gaiaAddress = await getGaiaAddressFromPublicKey();
        setGaiaAddress(_gaiaAddress);
    }

    // Filter and search functions
    function filterPolls(polls) {
        if (!polls?.list || !polls?.ref) return [];

        return polls.list.filter(pollId => {
            const poll = polls.ref[pollId];
            if (!poll) return false;

            // Filter out archived polls from main dashboard
            if (poll.archived === true) return false;

            // Search filter
            const matchesSearch = searchQuery === "" ||
                poll.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                poll.description?.toLowerCase().includes(searchQuery.toLowerCase());

            // Status filter
            let matchesStatus = true;
            if (statusFilter !== "all") {
                const pollStatus = getPollStatus(poll);
                matchesStatus = pollStatus === statusFilter;
            }

            return matchesSearch && matchesStatus;
        });
    }

    function getPollStatus(poll) {
        if (poll?.archived === true) return "archived";
        if (poll?.status === "draft") return "draft";
        if (poll?.endAt && new Date(poll?.endAt) < new Date()) return "closed";
        return "active";
    }

    function sortPolls(pollIds) {
        return pollIds.sort((a, b) => {
            const pollA = allPolls.ref[a];
            const pollB = allPolls.ref[b];

            if (sortBy === "date") {
                const dateA = new Date(pollA?.updatedAt || pollA?.createdAt || 0);
                const dateB = new Date(pollB?.updatedAt || pollB?.createdAt || 0);
                return dateB - dateA; // Descending order (most recent first)
            } else if (sortBy === "title") {
                return (pollA?.title || "").localeCompare(pollB?.title || "");
            } else if (sortBy === "status") {
                const statusA = getPollStatus(pollA);
                const statusB = getPollStatus(pollB);
                return statusA.localeCompare(statusB);
            }
            return 0;
        });
    }

    // Edit description modal functions
    function handleEditDescription(poll, event) {
        event.preventDefault();
        event.stopPropagation();
        setSelectedPoll(poll);
        setShowEditModal(true);
    }

    function handleCloseEditModal() {
        setShowEditModal(false);
        setSelectedPoll(null);
    }

    function handleDescriptionUpdated(pollId, newDescription, updatedAt) {
        if (allPolls?.ref && allPolls.ref[pollId]) {
            // Update the poll in the state
            const updatedRef = { ...allPolls.ref };
            updatedRef[pollId] = {
                ...updatedRef[pollId],
                description: newDescription,
                updatedAt: updatedAt
            };

            setAllPolls({
                ...allPolls,
                ref: updatedRef
            });
        }
    }

    // Archive modal functions
    function handleArchivePoll(poll, event) {
        event.preventDefault();
        event.stopPropagation();
        setPollToArchive(poll);
        setShowArchiveModal(true);
    }

    // Edit poll function for draft polls
    function handleEditPoll(poll, event) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = `/builder/${poll.id}/draft`;
    }

    function handleCloseArchiveModal() {
        setShowArchiveModal(false);
        setPollToArchive(null);
    }

    function handlePollArchived(pollId, updatedAt) {
        if (allPolls?.ref && allPolls.ref[pollId]) {
            // Update the poll in the state to mark it as archived
            const updatedRef = { ...allPolls.ref };
            updatedRef[pollId] = {
                ...updatedRef[pollId],
                archived: true,
                status: "closed",
                updatedAt: updatedAt
            };

            setAllPolls({
                ...allPolls,
                ref: updatedRef
            });
        }
    }

    function renderPollTableRow(pollIndexObject) {
        const getStatusConfig = (poll) => {
            if (poll?.status === "draft") {
                return { type: "draft", label: "Draft" };
            }
            if (poll?.endAt && new Date(poll?.endAt) < new Date()) {
                return { type: "closed", label: "Closed" };
            }
            return { type: "active", label: "Active" };
        };

        const statusConfig = getStatusConfig(pollIndexObject);
        const pollUrl = pollIndexObject?.status == "draft"
            ? `/builder/${pollIndexObject.id}/draft`
            : `/${pollIndexObject.id}/${gaiaAddress}`;

        const truncateDescription = (text, maxLength = 120) => {
            if (!text) return "";
            const cleanText = text.replace(/<[^>]*>/g, '');
            return cleanText.length > maxLength ? cleanText.slice(0, maxLength) + "..." : cleanText;
        };

        const handleRowClick = (e) => {
            // Only navigate if the click is not on the dropdown or its children
            const isDropdownClick = e.target.closest(`.${styles.table_modern_action_dropdown}`) ||
                e.target.closest(`.${styles.modern_action_dropdown}`) ||
                e.target.closest(`.${styles.modern_three_dot_button}`) ||
                e.target.closest(`.${styles.modern_dropdown_menu}`);

            if (!isDropdownClick) {
                window.location.href = pollUrl;
            }
        };

        return (
            <tr key={pollIndexObject.id} className={styles.table_row} onClick={handleRowClick}>
                <td className={styles.table_cell_title}>
                    <div className={styles.poll_title_wrapper}>
                        <h3 className={styles.table_poll_title}>
                            {pollIndexObject?.title || "Untitled Poll"}
                        </h3>
                        {pollIndexObject?.description && (
                            <div className={styles.table_poll_description}>
                                {truncateDescription(pollIndexObject.description)}
                            </div>
                        )}
                    </div>
                </td>
                <td className={styles.table_cell_status}>
                    <div className={`${styles.status_pill} ${styles[`status_pill_${statusConfig.type}`]}`}>
                        {statusConfig.label}
                    </div>
                </td>
                <td className={styles.table_cell_date}>
                    <div className={styles.table_date_content}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M3 0.5C3.27614 0.5 3.5 0.723858 3.5 1V2H10.5V1C10.5 0.723858 10.7239 0.5 11 0.5C11.2761 0.5 11.5 0.723858 11.5 1V2H12.5C13.0523 2 13.5 2.44772 13.5 3V12.5C13.5 13.0523 13.0523 13.5 12.5 13.5H1.5C0.947715 13.5 0.5 13.0523 0.5 12.5V3C0.5 2.44772 0.947715 2 1.5 2H2.5V1C2.5 0.723858 2.72386 0.5 3 0.5ZM1.5 5.5V12.5H12.5V5.5H1.5ZM3 7C3 6.72386 3.22386 6.5 3.5 6.5H4.5C4.77614 6.5 5 6.72386 5 7V8C5 8.27614 4.77614 8.5 4.5 8.5H3.5C3.22386 8.5 3 8.27614 3 8V7Z" fill="currentColor" />
                        </svg>
                        <span>{convertToDisplayDateFormat(pollIndexObject?.updatedAt)}</span>
                    </div>
                </td>
                <td className={styles.table_cell_actions}>
                    <ModernActionDropdown
                        poll={pollIndexObject}
                        onEditDescription={handleEditDescription}
                        onArchive={handleArchivePoll}
                        onEditPoll={handleEditPoll}
                        isTableView={true}
                    />
                </td>
            </tr>
        );
    }

    function renderPollCard(pollIndexObject) {
        const getStatusConfig = (poll) => {
            if (poll?.status === "draft") {
                return { type: "draft", label: "Draft" };
            }
            if (poll?.endAt && new Date(poll?.endAt) < new Date()) {
                return { type: "closed", label: "Closed" };
            }
            return { type: "active", label: "Active" };
        };

        const statusConfig = getStatusConfig(pollIndexObject);
        const pollUrl = pollIndexObject?.status == "draft"
            ? `/builder/${pollIndexObject.id}/draft`
            : `/${pollIndexObject.id}/${gaiaAddress}`;

        const handleCardClick = (e) => {
            // Only navigate if the click is not on the dropdown or its children
            const isDropdownClick = e.target.closest(`.${styles.modern_action_dropdown}`) ||
                e.target.closest(`.${styles.modern_three_dot_button}`) ||
                e.target.closest(`.${styles.modern_dropdown_menu}`);

            if (!isDropdownClick) {
                window.location.href = pollUrl;
            }
        };

        return (
            <div key={pollIndexObject.id} className={styles.poll_card} onClick={handleCardClick}>
                {/* Action Dropdown Button */}
                <ModernActionDropdown
                    poll={pollIndexObject}
                    onEditDescription={handleEditDescription}
                    onArchive={handleArchivePoll}
                    onEditPoll={handleEditPoll}
                    isTableView={false}
                />

                <div className={styles.poll_card_header}>
                    <h3 className={styles.poll_card_title}>
                        {pollIndexObject?.title || "Untitled Poll"}
                    </h3>
                    <div className={`${styles.status_pill} ${styles[`status_pill_${statusConfig.type}`]}`}>
                        {statusConfig.label}
                    </div>
                </div>

                {pollIndexObject?.description && (
                    <div className={styles.poll_card_description}>
                        {pollIndexObject.description.replace(/<[^>]*>/g, '')}
                    </div>
                )}

                <div className={styles.poll_card_meta}>
                    <div className={styles.poll_card_date}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M3 0.5C3.27614 0.5 3.5 0.723858 3.5 1V2H10.5V1C10.5 0.723858 10.7239 0.5 11 0.5C11.2761 0.5 11.5 0.723858 11.5 1V2H12.5C13.0523 2 13.5 2.44772 13.5 3V12.5C13.5 13.0523 13.0523 13.5 12.5 13.5H1.5C0.947715 13.5 0.5 13.0523 0.5 12.5V3C0.5 2.44772 0.947715 2 1.5 2H2.5V1C2.5 0.723858 2.72386 0.5 3 0.5ZM1.5 5.5V12.5H12.5V5.5H1.5ZM3 7C3 6.72386 3.22386 6.5 3.5 6.5H4.5C4.77614 6.5 5 6.72386 5 7V8C5 8.27614 4.77614 8.5 4.5 8.5H3.5C3.22386 8.5 3 8.27614 3 8V7Z" fill="currentColor" />
                        </svg>
                        {convertToDisplayDateFormat(pollIndexObject?.updatedAt)}
                    </div>
                </div>
            </div>
        );
    }

    // Design
    return (
        <div className={styles.dashboard_container}>
            <div className={styles.dashboard_content}>
                {gaiaAddress && allPolls?.list && allPolls?.ref ? (
                    allPolls?.list?.length > 0 ? (
                        <>
                            {/* Page Header */}
                            <div className={styles.page_header}>
                                <h1 className={styles.page_title}>All Polls</h1>
                            </div>

                            {/* World-Class Toolbar */}
                            <div className={styles.toolbar}>
                                {/* Left Section: Search */}
                                <div className={styles.toolbar_section_left}>
                                    <div className={`${styles.search_container} ${isSearchFocused ? styles.search_focused : ''}`}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.search_icon}>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13C8.38447 13 9.66544 12.5495 10.6923 11.789L14.7071 15.7071C15.0976 16.0976 15.7308 16.0976 16.1213 15.7071C16.5118 15.3166 16.5118 14.6834 16.1213 14.2929L12.1061 10.2778C12.6597 9.37225 13 8.32009 13 7C13 3.68629 10.3137 1 7 1ZM3 7C3 4.79086 4.79086 3 7 3C9.20914 3 11 4.79086 11 7C11 9.20914 9.20914 11 7 11C4.79086 11 3 9.20914 3 7Z" fill="currentColor" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Search polls..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setIsSearchFocused(true)}
                                            onBlur={() => setIsSearchFocused(false)}
                                            className={styles.search_input}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                className={styles.search_clear}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path fillRule="evenodd" clipRule="evenodd" d="M7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14C10.866 14 14 10.866 14 7C14 3.13401 10.866 0 7 0ZM10.2678 4.73223C10.5607 5.02513 10.5607 5.49999 10.2678 5.79289L8.06066 8L10.2678 10.2071C10.5607 10.5 10.5607 10.9749 10.2678 11.2678C9.97487 11.5607 9.50001 11.5607 9.20711 11.2678L7 9.06066L4.79289 11.2678C4.49999 11.5607 4.02513 11.5607 3.73223 11.2678C3.43934 10.9749 3.43934 10.5 3.73223 10.2071L5.93934 8L3.73223 5.79289C3.43934 5.49999 3.43934 5.02513 3.73223 4.73223C4.02513 4.43934 4.49999 4.43934 4.79289 4.73223L7 6.93934L9.20711 4.73223C9.50001 4.43934 9.97487 4.43934 10.2678 4.73223Z" fill="currentColor" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Right Section: Filters and View Toggle */}
                                <div className={styles.toolbar_section_right}>
                                    {/* Status Filter */}
                                    <div className={styles.filter_wrapper}>
                                        <label className={styles.filter_label_inline}>
                                            Status
                                        </label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className={styles.filter_select_standalone}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="draft">Draft</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>

                                    {/* Sort Filter */}
                                    <div className={styles.filter_wrapper}>
                                        <label className={styles.filter_label_inline}>
                                            Sort by
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className={styles.filter_select_standalone}
                                        >
                                            <option value="date">Last Modified</option>
                                            <option value="title">Title (A-Z)</option>
                                            <option value="status">By Status</option>
                                        </select>
                                    </div>

                                    {/* View Toggle */}
                                    <div className={styles.toolbar_divider}></div>
                                    <div className={styles.view_toggle}>
                                        <button
                                            onClick={() => setViewMode("grid")}
                                            className={`${styles.view_toggle_btn} ${viewMode === "grid" ? styles.view_toggle_active : ''}`}
                                            title="Grid View"
                                            aria-label="Grid View"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                                <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                                <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                                <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setViewMode("list")}
                                            className={`${styles.view_toggle_btn} ${viewMode === "list" ? styles.view_toggle_active : ''}`}
                                            title="List View"
                                            aria-label="List View"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <line x1="4" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                <line x1="4" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                <line x1="4" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                <circle cx="1.5" cy="4" r="1.5" fill="currentColor" />
                                                <circle cx="1.5" cy="8" r="1.5" fill="currentColor" />
                                                <circle cx="1.5" cy="12" r="1.5" fill="currentColor" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Results Summary */}
                            {(searchQuery || statusFilter !== "all") && (
                                <div className={styles.results_summary}>
                                    {(() => {
                                        const filteredPolls = filterPolls(allPolls);
                                        const totalPolls = allPolls.list.length;
                                        return (
                                            <p className={styles.results_text}>
                                                Showing {filteredPolls.length} of {totalPolls} polls
                                                {searchQuery && <span> matching "{searchQuery}"</span>}
                                                {statusFilter !== "all" && <span> with status "{statusFilter}"</span>}
                                            </p>
                                        );
                                    })()
                                    }
                                </div>
                            )}

                            {/* Polls Container */}
                            {viewMode === "grid" ? (
                                <div className={styles.polls_grid}>
                                    {(() => {
                                        const filteredPolls = filterPolls(allPolls);
                                        const sortedPolls = sortPolls(filteredPolls);

                                        if (sortedPolls.length === 0 && (searchQuery || statusFilter !== "all")) {
                                            return (
                                                <div className={styles.no_results}>
                                                    <div className={styles.no_results_icon}>
                                                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />
                                                            <path d="M28 28L36 36M36 28L28 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                                                        </svg>
                                                    </div>
                                                    <h3 className={styles.no_results_title}>No polls found</h3>
                                                    <p className={styles.no_results_description}>
                                                        Try adjusting your search or filter criteria
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            setSearchQuery("");
                                                            setStatusFilter("all");
                                                        }}
                                                        className={styles.clear_filters_btn}
                                                    >
                                                        Clear all filters
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return sortedPolls.map((pollId) => renderPollCard(allPolls.ref[pollId]));
                                    })()
                                    }
                                </div>
                            ) : (
                                <div className={styles.polls_table_container}>
                                    <table className={styles.polls_table}>
                                        <thead className={styles.table_header}>
                                            <tr>
                                                <th className={styles.table_header_cell_title}>Poll</th>
                                                <th className={styles.table_header_cell_status}>Status</th>
                                                <th className={styles.table_header_cell_date}>Last Modified</th>
                                                <th className={styles.table_header_cell_actions}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className={styles.table_body}>
                                            {(() => {
                                                const filteredPolls = filterPolls(allPolls);
                                                const sortedPolls = sortPolls(filteredPolls);

                                                if (sortedPolls.length === 0 && (searchQuery || statusFilter !== "all")) {
                                                    return (
                                                        <tr>
                                                            <td colSpan="4" className={styles.table_no_results}>
                                                                <div className={styles.no_results}>
                                                                    <div className={styles.no_results_icon}>
                                                                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />
                                                                            <path d="M18 18L30 30M30 18L18 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                                                                        </svg>
                                                                    </div>
                                                                    <h3 className={styles.no_results_title}>No polls found</h3>
                                                                    <p className={styles.no_results_description}>
                                                                        Try adjusting your search or filter criteria
                                                                    </p>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSearchQuery("");
                                                                            setStatusFilter("all");
                                                                        }}
                                                                        className={styles.clear_filters_btn}
                                                                    >
                                                                        Clear all filters
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return sortedPolls.map((pollId) => renderPollTableRow(allPolls.ref[pollId]));
                                            })()
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.empty_state}>
                            <div className={styles.empty_state_icon}>
                                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="60" cy="60" r="58" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" opacity="0.3" />
                                    <rect x="30" y="45" width="60" height="8" rx="4" fill="currentColor" opacity="0.2" />
                                    <rect x="30" y="57" width="45" height="6" rx="3" fill="currentColor" opacity="0.15" />
                                    <rect x="30" y="67" width="55" height="6" rx="3" fill="currentColor" opacity="0.15" />
                                    <circle cx="45" cy="30" r="3" fill="currentColor" opacity="0.3" />
                                    <circle cx="75" cy="25" r="2" fill="currentColor" opacity="0.2" />
                                    <circle cx="85" cy="35" r="2.5" fill="currentColor" opacity="0.25" />
                                </svg>
                            </div>
                            <h2 className={styles.empty_state_title}>No polls yet</h2>
                            <p className={styles.empty_state_description}>
                                Create your first poll to start gathering opinions and making decisions with your community.
                            </p>
                            <div className={styles.empty_state_action}>
                                <Link href="/builder/new">
                                    <Button className="action_secondary_btn" style={{ padding: '12px 32px' }}>
                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C9.41421 1.5 9.75 1.83579 9.75 2.25V8.25H15.75C16.1642 8.25 16.5 8.58579 16.5 9C16.5 9.41421 16.1642 9.75 15.75 9.75H9.75V15.75C9.75 16.1642 9.41421 16.5 9 16.5C8.58579 16.5 8.25 16.1642 8.25 15.75V9.75H2.25C1.83579 9.75 1.5 9.41421 1.5 9C1.5 8.58579 1.83579 8.25 2.25 8.25H8.25V2.25C8.25 1.83579 8.58579 1.5 9 1.5Z" fill="currentColor" />
                                        </svg>
                                        Create your first poll
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )
                ) : (
                    <>
                        {/* Loading State */}
                        <div className={styles.section_header}>
                            <div className={`${styles.skeleton} ${styles.skeleton_title}`}></div>
                        </div>

                        <div className={styles.polls_grid}>
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className={styles.skeleton_card}>
                                    <div className={`${styles.skeleton} ${styles.skeleton_card_title}`}></div>
                                    <div className={`${styles.skeleton} ${styles.skeleton_card_description}`}></div>
                                    <div className={`${styles.skeleton} ${styles.skeleton_card_description}`}></div>
                                    <div className={`${styles.skeleton} ${styles.skeleton_card_meta}`}></div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Edit Description Modal */}
            <EditDescriptionModal
                show={showEditModal}
                onHide={handleCloseEditModal}
                poll={selectedPoll}
                onDescriptionUpdated={handleDescriptionUpdated}
            />

            {/* Archive Confirmation Modal */}
            <ArchiveConfirmationModal
                show={showArchiveModal}
                onHide={handleCloseArchiveModal}
                poll={pollToArchive}
                onArchiveSuccess={handlePollArchived}
            />
        </div>
    );
}
