import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import styles from '../../styles/Builder.module.css';

export default function DustTransactionModal({
    show,
    onHide,
    option,
    onSave
}) {
    const [dustAddress, setDustAddress] = useState('');
    const [dustAmount, setDustAmount] = useState('');
    const [errors, setErrors] = useState({});

    // Initialize form with existing values when modal opens
    useEffect(() => {
        if (show && option) {
            setDustAddress(option.dustAddress || '');
            setDustAmount(option.dustAmount || '');
            setErrors({});
        }
    }, [show, option]);

    const validateForm = () => {
        const newErrors = {};

        if (!dustAddress || dustAddress.trim() === '') {
            newErrors.dustAddress = 'Dust transaction address is required';
        } else if (dustAddress.trim().length < 10) {
            newErrors.dustAddress = 'Please enter a valid transaction address';
        }

        if (!dustAmount || dustAmount.trim() === '') {
            newErrors.dustAmount = 'Dust amount is required';
        } else if (isNaN(parseFloat(dustAmount)) || parseFloat(dustAmount) <= 0) {
            newErrors.dustAmount = 'Please enter a valid amount greater than 0';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateForm()) {
            onSave({
                dustAddress: dustAddress.trim(),
                dustAmount: parseFloat(dustAmount)
            });
            onHide();
        }
    };

    const handleClose = () => {
        setDustAddress('');
        setDustAmount('');
        setErrors({});
        onHide();
    };

    const handleClear = () => {
        onSave({
            dustAddress: '',
            dustAmount: ''
        });
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="md" className={styles.dust_modal}>
            <Modal.Header closeButton className={styles.modal_header}>
                <Modal.Title className={styles.modal_title}>
                    <div>
                        <h4>Dust Transaction Settings</h4>
                        <p>Configure dust details for "{option?.value || 'this option'}"</p>
                    </div>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className={styles.modal_body}>
                <div className={styles.modal_form}>
                    <Form.Group className={styles.form_group}>
                        <Form.Label className={styles.form_label}>
                            Transaction Address *
                        </Form.Label>
                        <Form.Control
                            type="text"
                            value={dustAddress}
                            onChange={(e) => setDustAddress(e.target.value)}
                            placeholder="e.g., ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                            className={`${styles.form_input} ${errors.dustAddress ? styles.error : ''}`}
                            autoFocus
                        />
                        {errors.dustAddress && (
                            <small className={styles.field_error}>
                                {errors.dustAddress}
                            </small>
                        )}
                        <small className={styles.field_hint}>
                            The STX address where dust will be sent when this option is selected
                        </small>
                    </Form.Group>

                    <Form.Group className={styles.form_group}>
                        <Form.Label className={styles.form_label}>
                            Amount (STX) *
                        </Form.Label>
                        <Form.Control
                            type="number"
                            step="0.000001"
                            min="0.000001"
                            value={dustAmount}
                            onChange={(e) => setDustAmount(e.target.value)}
                            placeholder="e.g., 0.000001"
                            className={`${styles.form_input} ${errors.dustAmount ? styles.error : ''}`}
                        />
                        {errors.dustAmount && (
                            <small className={styles.field_error}>
                                {errors.dustAmount}
                            </small>
                        )}
                        <small className={styles.field_hint}>
                            Minimum dust amount to send (typically 0.000001 STX)
                        </small>
                    </Form.Group>

                    <div className={styles.modal_info}>
                        <div className={styles.info_icon}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" fill="currentColor" />
                                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" fill="currentColor" />
                            </svg>
                        </div>
                        <p>
                            Dust transactions are minimal STX amounts sent when voters select this option.
                            This can be used for tracking, analytics, or micro-incentives.
                        </p>
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer className={styles.modal_footer}>
                <div className={styles.modal_actions}>
                    {(option?.dustAddress && option?.dustAddress.trim()) || (option?.dustAmount && option?.dustAmount.toString().trim()) ? (
                        <Button
                            onClick={handleClear}
                            className={styles.modal_delete_button}
                            title="Delete dust settings"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.5 1a.5.5 0 0 0-.5.5v1H2a.5.5 0 0 0 0 1h1.5v8a2.5 2.5 0 0 0 2.5 2.5h4a2.5 2.5 0 0 0 2.5-2.5v-8H14a.5.5 0 0 0 0-1h-2.5v-1a.5.5 0 0 0-.5-.5h-5zm2 3a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm2 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5z" fill="currentColor" />
                            </svg>
                        </Button>
                    ) : null}

                    <div className={styles.modal_main_actions}>
                        <Button
                            onClick={handleClose}
                            className="action_secondary_btn"
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={handleSave}
                            className="action_primary_btn"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor" />
                            </svg>
                            Save Settings
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
}