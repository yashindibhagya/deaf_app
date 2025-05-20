/**
 * Service for loading and processing sign language data
 */
import CloudinaryUtils from '../app/utils/CloudinaryUtils';

// Import JSON data files
import englishAlphabet from '../assets/Data/englishAlphabet.json';
import sinhalaAlphabet from '../assets/Data/sinhalaAlphabet.json';
import conversationSigns from '../assets/Data/conversationSigns.json';
import whQuestions from '../assets/Data/whQuestions.json';
import categories from '../assets/Data/categories.json';
//import actions from '../assets/Data/actions.json';
import numbers from '../assets/Data/numbers.json';
import people from '../assets/Data/people.json';
import colors from '../assets/Data/colors.json';
import animal from '../assets/Data/animal.json';
import greeting from '../assets/Data/greeting.json'

/**
 * Load and process all sign data from the JSON files
 * @returns {Promise<{signs: Array, courses: Array}>} Processed signs and courses
 */
export const loadAllSignData = async () => {
    try {
        // Combine all the sign data from imported JSON files
        const allSigns = [
            ...englishAlphabet,
            ...sinhalaAlphabet,
            ...conversationSigns,
            ...whQuestions,
            //...actions,
            ...numbers,
            ...people,
            ...colors,
            ...animal,
            ...greeting
        ];

        // Process signs to ensure all required properties exist
        const processedSigns = processSignData(allSigns);

        // Organize courses data
        const coursesData = organizeCoursesData(processedSigns, categories);

        return {
            signs: processedSigns,
            courses: coursesData
        };
    } catch (error) {
        console.error("Error loading sign data:", error);
        throw error;
    }
};

/**
 * Process sign data to ensure all required properties exist
 * @param {Array} signs - Raw sign data 
 * @returns {Array} Processed sign data
 */
const processSignData = (signs) => {
    return signs.map(sign => {
        // Generate a signId if missing
        if (!sign.signId) {
            sign.signId = `${sign.word ? sign.word.toLowerCase().replace(/\s+/g, '-') : 'unknown'}-001`;
        }

        // Update or generate videoUrl if missing or invalid
        if (!sign.videoUrl || typeof sign.videoUrl !== 'string' || !sign.videoUrl.startsWith('http')) {
            // Try to generate a URL using CloudinaryUtils
            sign.videoUrl = CloudinaryUtils.getSignVideoUrl(sign.word);
        }

        // Update or generate thumbnailUrl if missing
        if (!sign.thumbnailUrl || typeof sign.thumbnailUrl !== 'string' || !sign.thumbnailUrl.startsWith('http')) {
            sign.thumbnailUrl = CloudinaryUtils.getSignThumbnailUrl(sign.word);
        }

        // Ensure category exists
        if (!sign.category) {
            sign.category = 'uncategorized';
        }

        // Ensure relatedSigns is an array
        if (!sign.relatedSigns) {
            sign.relatedSigns = [];
        }

        return sign;
    });
};

/**
 * Organize courses data using sign data and categories
 * @param {Array} signs - Processed sign data
 * @param {Array} categories - Categories data 
 * @returns {Array} Organized courses data
 */
const organizeCoursesData = (signs, categories) => {
    // Group signs by category
    const categoriesMap = {};

    signs.forEach(sign => {
        if (!categoriesMap[sign.category]) {
            categoriesMap[sign.category] = [];
        }
        categoriesMap[sign.category].push(sign);
    });

    // Create course data by combining categories metadata with signs
    return categories.map(category => ({
        ...category,
        totalChapters: categoriesMap[category.id]?.length || 0,
        signs: categoriesMap[category.id] || []
    }));
};

/**
 * Get signs by category
 * @param {string} category - Category name
 * @param {Array} signs - All signs data
 * @returns {Array} Signs filtered by category
 */
export const getSignsByCategory = (category, signs) => {
    return signs.filter(sign => sign.category === category);
};

/**
 * Get signs by search query
 * @param {string} query - Search query
 * @param {Array} signs - All signs data
 * @returns {Array} Filtered signs
 */
export const searchSigns = (query, signs) => {
    if (!query || !signs) return [];

    const searchQuery = query.toLowerCase().trim();

    return signs.filter(sign => {
        // Search in English word
        if (sign.word && sign.word.toLowerCase().includes(searchQuery)) {
            return true;
        }

        // Search in Sinhala transliteration
        if (sign.sinhalaTranslit) {
            if (typeof sign.sinhalaTranslit === 'string' &&
                sign.sinhalaTranslit.toLowerCase().includes(searchQuery)) {
                return true;
            } else if (Array.isArray(sign.sinhalaTranslit) &&
                sign.sinhalaTranslit.some(t => t.toLowerCase().includes(searchQuery))) {
                return true;
            }
        }

        // Search in Tamil transliteration
        if (sign.tamilTranslit) {
            if (typeof sign.tamilTranslit === 'string' &&
                sign.tamilTranslit.toLowerCase().includes(searchQuery)) {
                return true;
            } else if (Array.isArray(sign.tamilTranslit) &&
                sign.tamilTranslit.some(t => t.toLowerCase().includes(searchQuery))) {
                return true;
            }
        }

        // Search in related signs
        if (sign.relatedSigns && Array.isArray(sign.relatedSigns) &&
            sign.relatedSigns.some(related => related.toLowerCase().includes(searchQuery))) {
            return true;
        }

        return false;
    });
};

/**
 * Get a sign by its ID
 * @param {string} signId - Sign ID
 * @param {Array} signs - All signs data
 * @returns {Object|null} Found sign or null
 */
export const getSignById = (signId, signs) => {
    if (!signId || !signs) return null;
    return signs.find(sign => sign.signId === signId) || null;
};

/**
 * Get a course by its ID
 * @param {string} courseId - Course ID
 * @param {Array} courses - All courses data
 * @returns {Object|null} Found course or null
 */
export const getCourseById = (courseId, courses) => {
    if (!courseId || !courses) return null;
    return courses.find(course => course.id === courseId) || null;
};