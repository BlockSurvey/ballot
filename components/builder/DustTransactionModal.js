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
    const [dustBtcAddress, setDustBtcAddress] = useState('');
    const [dustBtcAmount, setDustBtcAmount] = useState('');
    const [poxCycles, setPoxCycles] = useState('');
    const [enableBtcDust, setEnableBtcDust] = useState(false);
    const [errors, setErrors] = useState({});

    // Initialize form with existing values when modal opens
    useEffect(() => {
        if (show && option) {
            setDustAddress(option.dustAddress || '');
            setDustAmount(option.dustAmount || '');
            setDustBtcAddress(option.dustBtcAddress || '');
            setDustBtcAmount(option.dustBtcAmount || '');
            setPoxCycles(option.poxCycles || '');
            // Enable BTC dust section if any BTC fields have values
            setEnableBtcDust(!!(option.dustBtcAddress || option.dustBtcAmount || option.poxCycles));
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

        if (!dustAmount || dustAmount.toString().trim() === '') {
            newErrors.dustAmount = 'Dust amount is required';
        } else if (isNaN(parseFloat(dustAmount)) || parseFloat(dustAmount) <= 0) {
            newErrors.dustAmount = 'Please enter a valid amount greater than 0';
        }

        // Only validate BTC fields if BTC dust is enabled
        if (enableBtcDust) {
            // Validate BTC Address (optional)
            if (dustBtcAddress && dustBtcAddress.trim() !== '' && dustBtcAddress.trim().length < 10) {
                newErrors.dustBtcAddress = 'Please enter a valid BTC address';
            }

            // Validate BTC Amount (optional, but if provided must be valid)
            if (dustBtcAmount && dustBtcAmount.toString().trim() !== '' && (isNaN(parseFloat(dustBtcAmount)) || parseFloat(dustBtcAmount) <= 0)) {
                newErrors.dustBtcAmount = 'Please enter a valid BTC amount greater than 0';
            }

            // Validate Pox Cycles (optional, but if provided must be comma-separated numbers)
            if (poxCycles && poxCycles.trim() !== '') {
                const cycles = poxCycles.split(',').map(cycle => cycle.trim());
                const invalidCycles = cycles.filter(cycle => isNaN(parseInt(cycle)) || parseInt(cycle) <= 0);
                if (invalidCycles.length > 0) {
                    newErrors.poxCycles = 'Please enter comma-separated cycle numbers (e.g., 112,113,114)';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateForm()) {
            onSave({
                dustAddress: dustAddress.trim(),
                dustAmount: parseFloat(dustAmount),
                dustBtcAddress: enableBtcDust ? dustBtcAddress.trim() : '',
                dustBtcAmount: (enableBtcDust && dustBtcAmount) ? parseFloat(dustBtcAmount) : '',
                poxCycles: enableBtcDust ? poxCycles.trim() : ''
            });
            onHide();
        }
    };

    const handleClose = () => {
        setDustAddress('');
        setDustAmount('');
        setDustBtcAddress('');
        setDustBtcAmount('');
        setPoxCycles('');
        setEnableBtcDust(false);
        setErrors({});
        onHide();
    };

    const handleClear = () => {
        onSave({
            dustAddress: '',
            dustAmount: '',
            dustBtcAddress: '',
            dustBtcAmount: '',
            poxCycles: ''
        });
        onHide();
    };

    const handleBtcDustToggle = (e) => {
        const enabled = e.target.checked;
        setEnableBtcDust(enabled);
        
        // Clear BTC fields when disabling
        if (!enabled) {
            setDustBtcAddress('');
            setDustBtcAmount('');
            setPoxCycles('');
            // Clear any BTC-related errors
            const newErrors = { ...errors };
            delete newErrors.dustBtcAddress;
            delete newErrors.dustBtcAmount;
            delete newErrors.poxCycles;
            setErrors(newErrors);
        }
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
                    {/* STX Transaction Settings */}
                    <div className={styles.form_section_group}>
                        <h5 className={styles.section_group_title}>STX Transaction</h5>
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
                    </div>

                    {/* BTC Dust Toggle */}
                    <div className={styles.toggle_section}>
                        <Form.Check
                            type="switch"
                            id="enable-btc-dust"
                            label="Add Bitcoin Dust Settings"
                            checked={enableBtcDust}
                            onChange={handleBtcDustToggle}
                            className={styles.form_switch}
                        />
                        <small className={styles.field_hint}>
                            Enable to add Bitcoin address, amount, and Pox cycle configuration for this option
                        </small>
                    </div>

                    {/* BTC & Pox Settings - Only show if enabled */}
                    {enableBtcDust && (
                    <div className={styles.form_section_group}>
                        <h5 className={styles.section_group_title}>Bitcoin & Pox Settings</h5>

                    <Form.Group className={styles.form_group}>
                        <Form.Label className={styles.form_label}>
                            BTC Address (Optional)
                        </Form.Label>
                        <Form.Control
                            type="text"
                            value={dustBtcAddress}
                            onChange={(e) => setDustBtcAddress(e.target.value)}
                            placeholder="e.g., 11111111111mdWK2VXcrA1ebnetG5Y"
                            className={`${styles.form_input} ${errors.dustBtcAddress ? styles.error : ''}`}
                        />
                        {errors.dustBtcAddress && (
                            <small className={styles.field_error}>
                                {errors.dustBtcAddress}
                            </small>
                        )}
                        <small className={styles.field_hint}>
                            Bitcoin address associated with this voting option for Pox rewards
                        </small>
                    </Form.Group>

                    <Form.Group className={styles.form_group}>
                        <Form.Label className={styles.form_label}>
                            BTC Amount (Optional)
                        </Form.Label>
                        <Form.Control
                            type="number"
                            step="0.00000001"
                            min="0.00000001"
                            value={dustBtcAmount}
                            onChange={(e) => setDustBtcAmount(e.target.value)}
                            placeholder="e.g., 0.000001"
                            className={`${styles.form_input} ${errors.dustBtcAmount ? styles.error : ''}`}
                        />
                        {errors.dustBtcAmount && (
                            <small className={styles.field_error}>
                                {errors.dustBtcAmount}
                            </small>
                        )}
                        <small className={styles.field_hint}>
                            Bitcoin amount associated with this voting option
                        </small>
                    </Form.Group>

                    <Form.Group className={styles.form_group}>
                        <Form.Label className={styles.form_label}>
                            Pox Cycles (Optional)
                        </Form.Label>
                        <Form.Control
                            type="text"
                            value={poxCycles}
                            onChange={(e) => setPoxCycles(e.target.value)}
                            placeholder="e.g., 112,113,114"
                            className={`${styles.form_input} ${errors.poxCycles ? styles.error : ''}`}
                        />
                        {errors.poxCycles && (
                            <small className={styles.field_error}>
                                {errors.poxCycles}
                            </small>
                        )}
                        <small className={styles.field_hint}>
                            Comma-separated Pox cycle numbers for stacking rewards (e.g., 112,113,114)
                        </small>
                    </Form.Group>
                    </div>
                    )}

                    <div className={styles.modal_info}>
                        <div className={styles.info_icon}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" fill="currentColor" />
                                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" fill="currentColor" />
                            </svg>
                        </div>
                        <p>
                            Dust transactions are minimal STX amounts sent when voters select this option.
                            You can also specify BTC addresses and amounts for Pox rewards, along with specific cycle numbers.
                            This can be used for tracking, analytics, micro-incentives, or stacking rewards distribution.
                        </p>
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer className={styles.modal_footer}>
                <div className={styles.modal_actions}>
                    {(option?.dustAddress && option?.dustAddress.trim()) || 
                     (option?.dustAmount && option?.dustAmount.toString().trim()) ||
                     (option?.dustBtcAddress && option?.dustBtcAddress.trim()) ||
                     (option?.dustBtcAmount && option?.dustBtcAmount.toString().trim()) ||
                     (option?.poxCycles && option?.poxCycles.trim()) ? (
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