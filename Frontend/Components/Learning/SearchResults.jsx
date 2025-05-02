import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from "@expo/vector-icons";
import { getDetailedSearchResults, highlightMatchingText } from '../../services/SearchService';

/**
 * Component to display search results from courses, chapters, and lessons
 * 
 * @param {Object} props Component props
 * @param {Array} props.courses Array of all courses to search through
 * @param {string} props.searchQuery Current search query
 * @param {Function} props.onResultPress Callback when a search result is pressed
 * @returns {React.Component} SearchResults component
 */
const SearchResults = ({ courses, searchQuery, onResultPress }) => {
    const router = useRouter();

    // Don't show results for empty queries
    if (!searchQuery || !searchQuery.trim()) {
        return null;
    }

    // Get detailed search results
    const searchResults = getDetailedSearchResults(courses, searchQuery);

    // Handle empty results
    if (searchResults.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={48} color="#666" />
                <Text style={styles.emptyText}>
                    No results found for "{searchQuery}"
                </Text>
                <Text style={styles.emptySubtext}>
                    Try using different keywords or check your spelling
                </Text>
            </View>
        );
    }

    // Navigate to the appropriate screen based on result type
    const handleResultPress = (result) => {
        if (onResultPress) {
            onResultPress(result);
            return;
        }

        switch (result.type) {
            case 'course':
                // Navigate to course details
                router.push({
                    pathname: '/courseView/courseDetails',
                    params: { id: result.courseId }
                });
                break;

            case 'chapter':
                // Navigate to specific chapter in course
                // FIX: Ensure we're using the correct path and parameters
                router.push({
                    pathname: '/chapterView',
                    params: {
                        chapterParams: JSON.stringify({
                            chapterTitle: result.chapterTitle,
                            chapterIndex: result.chapterIndex
                        }),
                        docId: result.courseId,
                        chapterIndex: result.chapterIndex
                    }
                });
                break;

            case 'lesson':
                // Navigate to specific sign/lesson
                // FIX: Ensure we're using the correct path and parameters
                router.push({
                    pathname: '/chapterView/[signId]',
                    params: {
                        signId: result.signId,
                        courseId: result.courseId
                    }
                });
                break;

            default:
                // Default to course view
                router.push({
                    pathname: '/courseView/courseDetails',
                    params: { id: result.courseId }
                });
        }
    };

    // Render a single result item
    const renderResultItem = ({ item }) => {
        // Get icon based on match type
        const getIcon = (type) => {
            switch (type) {
                case 'course':
                    return <MaterialIcons name="class" size={24} color="#155658" />;
                case 'chapter':
                    return <MaterialIcons name="bookmark" size={24} color="#F7B316" />;
                case 'lesson':
                    return <MaterialIcons name="school" size={24} color="#4C9EFF" />;
                default:
                    return <MaterialIcons name="info" size={24} color="#666" />;
            }
        };

        // Render the highlighted text
        const renderHighlightedText = (text) => {
            const segments = highlightMatchingText(text, searchQuery);

            return segments.map((segment, index) => (
                <Text
                    key={index}
                    style={segment.highlight ? styles.highlightedText : {}}
                >
                    {segment.text}
                </Text>
            ));
        };

        return (
            <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleResultPress(item)}
            >
                <View style={styles.resultIconContainer}>
                    {getIcon(item.type)}
                </View>

                <View style={styles.resultContent}>
                    <Text style={styles.resultTitle}>
                        {renderHighlightedText(
                            item.type === 'course'
                                ? item.courseTitle
                                : item.type === 'chapter'
                                    ? item.chapterTitle
                                    : item.lessonTitle
                        )}
                    </Text>

                    <Text style={styles.resultSubtitle}>
                        {item.type === 'course'
                            ? 'Course'
                            : item.type === 'chapter'
                                ? `Chapter in ${item.courseTitle}`
                                : `Lesson in ${item.courseTitle}`}
                    </Text>

                    {item.matchedOn === 'sinhalaWord' && (
                        <Text style={styles.additionalInfo}>
                            Matches Sinhala word: {typeof item.sinhalaWord === 'string'
                                ? item.sinhalaWord
                                : Array.isArray(item.sinhalaWord)
                                    ? item.sinhalaWord.join(', ')
                                    : ''
                            }
                        </Text>
                    )}
                </View>

                <MaterialIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
        );
    };

    // Render a group of results for a course
    const renderCourseGroup = ({ item }) => {
        return (
            <View style={styles.courseGroup}>
                <Text style={styles.courseGroupTitle}>{item.courseTitle}</Text>

                <FlatList
                    data={item.matches}
                    renderItem={renderResultItem}
                    keyExtractor={(match, index) => `${match.type}-${match.courseId}-${index}`}
                    scrollEnabled={false}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.resultsHeader}>
                {searchResults.length} {searchResults.length === 1 ? 'course' : 'courses'} found
            </Text>

            <FlatList
                data={searchResults}
                renderItem={renderCourseGroup}
                keyExtractor={(item) => item.courseId}
                contentContainerStyle={styles.resultsList}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        color: '#333',
        textAlign: 'center',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
    },
    resultsHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    resultsList: {
        paddingBottom: 20,
    },
    courseGroup: {
        marginBottom: 20,
    },
    courseGroupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#155658',
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    resultIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    resultContent: {
        flex: 1,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    resultSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    additionalInfo: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 4,
    },
    highlightedText: {
        backgroundColor: '#FFF9C4',
        fontWeight: 'bold',
    }
});

export default SearchResults;