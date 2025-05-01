/**
 * Search Service for the Learning Platform
 * Provides comprehensive search functionality across courses, chapters, and lessons
 */

/**
 * Search across courses, chapters, and lessons
 * 
 * @param {Array} courses - The array of course objects to search within
 * @param {string} query - The search query string
 * @param {Object} options - Optional search configuration
 * @param {boolean} options.caseSensitive - Whether search should be case sensitive (default: false)
 * @param {boolean} options.searchChapters - Whether to search in chapter titles (default: true)
 * @param {boolean} options.searchLessons - Whether to search in lesson titles (default: true)
 * @param {boolean} options.searchDescriptions - Whether to search in descriptions (default: true)
 * @returns {Object} Object containing matching courses with highlighted results
 */
export const searchLearningContent = (courses, query, options = {}) => {
    // Default options
    const {
        caseSensitive = false,
        searchChapters = true,
        searchLessons = true,
        searchDescriptions = true
    } = options;

    // Empty query returns all courses
    if (!query || !query.trim()) {
        return {
            courses: courses,
            totalMatches: courses.length,
            matchDetails: []
        };
    }

    const normalizedQuery = caseSensitive ? query.trim() : query.trim().toLowerCase();

    // Search results will include:
    // 1. Courses that match directly
    // 2. Courses containing matching chapters/lessons
    const matchingCourses = [];
    const matchDetails = [];

    courses.forEach(course => {
        let courseMatches = false;
        let chapterMatches = [];
        let lessonMatches = [];

        // Check course title
        const courseTitle = caseSensitive ? course.title : course.title.toLowerCase();
        if (courseTitle.includes(normalizedQuery)) {
            courseMatches = true;
            matchDetails.push({
                type: 'course',
                courseId: course.id,
                courseTitle: course.title,
                matchedOn: 'title'
            });
        }

        // Check course description
        if (!courseMatches && searchDescriptions && course.description) {
            const courseDescription = caseSensitive
                ? course.description
                : course.description.toLowerCase();

            if (courseDescription.includes(normalizedQuery)) {
                courseMatches = true;
                matchDetails.push({
                    type: 'course',
                    courseId: course.id,
                    courseTitle: course.title,
                    matchedOn: 'description'
                });
            }
        }

        // Check chapters
        if (searchChapters && course.chapters && Array.isArray(course.chapters)) {
            course.chapters.forEach((chapter, chapterIndex) => {
                if (!chapter) return;

                const chapterTitle = caseSensitive
                    ? chapter.chapterTitle || ''
                    : (chapter.chapterTitle || '').toLowerCase();

                if (chapterTitle.includes(normalizedQuery)) {
                    courseMatches = true;
                    chapterMatches.push(chapterIndex);

                    matchDetails.push({
                        type: 'chapter',
                        courseId: course.id,
                        courseTitle: course.title,
                        chapterIndex: chapterIndex,
                        chapterTitle: chapter.chapterTitle,
                        matchedOn: 'title'
                    });
                }
            });
        }

        // Check signs/lessons
        if (searchLessons && course.signs && Array.isArray(course.signs)) {
            course.signs.forEach((sign, signIndex) => {
                if (!sign) return;

                // Check lesson title/word
                const lessonTitle = caseSensitive
                    ? sign.word || ''
                    : (sign.word || '').toLowerCase();

                if (lessonTitle.includes(normalizedQuery)) {
                    courseMatches = true;
                    lessonMatches.push(signIndex);

                    matchDetails.push({
                        type: 'lesson',
                        courseId: course.id,
                        courseTitle: course.title,
                        lessonIndex: signIndex,
                        lessonTitle: sign.word,
                        signId: sign.signId,
                        matchedOn: 'title'
                    });
                }

                // Check Sinhala word if available
                if (sign.sinhalaWord) {
                    const sinhalaWord = typeof sign.sinhalaWord === 'string'
                        ? sign.sinhalaWord
                        : Array.isArray(sign.sinhalaWord)
                            ? sign.sinhalaWord.join(' ')
                            : '';

                    const normalizedSinhalaWord = caseSensitive
                        ? sinhalaWord
                        : sinhalaWord.toLowerCase();

                    if (normalizedSinhalaWord.includes(normalizedQuery)) {
                        courseMatches = true;
                        lessonMatches.push(signIndex);

                        matchDetails.push({
                            type: 'lesson',
                            courseId: course.id,
                            courseTitle: course.title,
                            lessonIndex: signIndex,
                            lessonTitle: sign.word,
                            signId: sign.signId,
                            matchedOn: 'sinhalaWord',
                            sinhalaWord: sign.sinhalaWord
                        });
                    }
                }
            });
        }

        // If the course or any of its chapters/lessons match, add it to results
        if (courseMatches) {
            // Create a copy of the course with highlighted information
            const highlightedCourse = {
                ...course,
                _matchInfo: {
                    matchedChapters: chapterMatches,
                    matchedLessons: lessonMatches,
                    matchedDirectly: courseTitle.includes(normalizedQuery)
                }
            };

            matchingCourses.push(highlightedCourse);
        }
    });

    return {
        courses: matchingCourses,
        totalMatches: matchingCourses.length,
        matchDetails: matchDetails
    };
};

/**
 * Get detailed search results for UI presentation
 * 
 * @param {Array} courses - Original array of courses
 * @param {string} query - Search query string
 * @returns {Array} Array of search result objects ready for display
 */
export const getDetailedSearchResults = (courses, query) => {
    if (!query || !query.trim()) return [];

    const { matchDetails } = searchLearningContent(courses, query);

    // Group results by course for better organization
    const groupedResults = matchDetails.reduce((groups, match) => {
        const courseId = match.courseId;

        if (!groups[courseId]) {
            groups[courseId] = {
                courseId: courseId,
                courseTitle: match.courseTitle,
                matches: []
            };
        }

        groups[courseId].matches.push(match);
        return groups;
    }, {});

    // Convert grouped object to array
    return Object.values(groupedResults);
};

/**
 * Highlight matching text in a string
 * 
 * @param {string} text - Original text to highlight
 * @param {string} query - Search query to highlight
 * @param {boolean} caseSensitive - Whether search is case sensitive
 * @returns {Array} Array of text segments with highlighting info
 */
export const highlightMatchingText = (text, query, caseSensitive = false) => {
    if (!text || !query || !query.trim()) return [{ text, highlight: false }];

    const normalizedQuery = caseSensitive ? query.trim() : query.trim().toLowerCase();
    const normalizedText = caseSensitive ? text : text.toLowerCase();

    // Find all occurrences of the query in the text
    const segments = [];
    let lastIndex = 0;
    let index = normalizedText.indexOf(normalizedQuery);

    while (index !== -1) {
        // Add non-matching segment before the match
        if (index > lastIndex) {
            segments.push({
                text: text.substring(lastIndex, index),
                highlight: false
            });
        }

        // Add matching segment
        segments.push({
            text: text.substring(index, index + normalizedQuery.length),
            highlight: true
        });

        // Move to after this match
        lastIndex = index + normalizedQuery.length;
        index = normalizedText.indexOf(normalizedQuery, lastIndex);
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
        segments.push({
            text: text.substring(lastIndex),
            highlight: false
        });
    }

    return segments;
};

export default {
    searchLearningContent,
    getDetailedSearchResults,
    highlightMatchingText
};