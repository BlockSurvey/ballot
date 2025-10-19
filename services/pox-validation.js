import axios from 'axios';
import { getStacksAPIPrefix } from './auth';

/**
 * Validate if a PoX cycle number is valid by checking Hiro API
 * @param {number} poxCycleNumber - The PoX cycle number to validate
 * @returns {Promise<Object>} - Validation result with isValid flag and data
 */
export const validatePoxCycle = async (poxCycleNumber) => {
    try {
        // Validate input
        if (!poxCycleNumber || isNaN(poxCycleNumber) || poxCycleNumber < 0) {
            return {
                isValid: false,
                error: 'Invalid PoX cycle number format',
                poxCycle: poxCycleNumber
            };
        }

        const cycleNum = parseInt(poxCycleNumber);
        
        // Check if the cycle exists by trying to fetch signers with limit=1
        const url = `${getStacksAPIPrefix()}/extended/v2/pox/cycles/${cycleNum}/signers?limit=1&offset=0`;
        
        const response = await axios.get(url, {
            timeout: 10000, // 10 second timeout
        });

        // If we get a response, check if it has the expected structure
        if (response.data && typeof response.data.total === 'number') {
            return {
                isValid: true,
                poxCycle: cycleNum,
                totalSigners: response.data.total,
                data: response.data
            };
        }

        return {
            isValid: false,
            error: 'Invalid response format from Hiro API',
            poxCycle: cycleNum
        };

    } catch (error) {
        // Handle different error cases
        if (error.response) {
            const status = error.response.status;
            const statusText = error.response.statusText;

            if (status === 404) {
                return {
                    isValid: false,
                    error: `PoX cycle ${poxCycleNumber} not found`,
                    poxCycle: parseInt(poxCycleNumber),
                    httpStatus: status
                };
            }

            if (status === 400) {
                return {
                    isValid: false,
                    error: `Invalid PoX cycle number: ${poxCycleNumber}`,
                    poxCycle: parseInt(poxCycleNumber),
                    httpStatus: status
                };
            }

            return {
                isValid: false,
                error: `API error: ${status} ${statusText}`,
                poxCycle: parseInt(poxCycleNumber),
                httpStatus: status
            };
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                isValid: false,
                error: 'Unable to connect to Stacks API',
                poxCycle: parseInt(poxCycleNumber)
            };
        }

        if (error.code === 'ETIMEDOUT') {
            return {
                isValid: false,
                error: 'Request timeout - Stacks API did not respond',
                poxCycle: parseInt(poxCycleNumber)
            };
        }

        console.error('Error validating PoX cycle:', error);
        return {
            isValid: false,
            error: `Validation failed: ${error.message}`,
            poxCycle: parseInt(poxCycleNumber)
        };
    }
};