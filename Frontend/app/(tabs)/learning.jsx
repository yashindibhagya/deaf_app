import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Keyboard
} from 'react-native';
import { MaterialIcons } from "@expo/vector-icons";
import { useVideo } from '../../context/VideoContext';
import Common from '../../Components/Container/Common';
import AllCourses from '../../Components/Learning/AllCourses';
import CompletedCourses from '../../Components/Learning/CompletedCourses';
import SearchResults from '../../Components/Learning/SearchResults';
import { searchLearningContent } from '../../services/SearchService';

export default function Learning() {
    const { coursesData, isLoading, getCourseProgress } = useVideo();
    const [activeTab, setActiveTab] = useState('courses'); // Default to 'courses' tab
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [completedCourses, setCompletedCourses] = useState([]);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [processedCourses, setProcessedCourses] = useState([]);

    // Process and prepare course data with progress information
    useEffect(() => {
        if (!coursesData) return;

        // Process all courses to calculate completion
        const processed = coursesData.map(course => {
            const progress = getCourseProgress(course.id);
            return { ...course, progress };
        });

        setProcessedCourses(processed);
    }, [coursesData, getCourseProgress]);

    // Handle search and filtering
    useEffect(() => {
        if (!processedCourses.length) return;

        // If search query is empty, just filter by completion status
        if (!searchQuery.trim()) {
            setFilteredCourses(processedCourses);
            setCompletedCourses(
                processedCourses.filter(course => course.progress.percentage === 100)
            );
            setIsSearchMode(false);
            return;
        }

        // If search query exists, use comprehensive search
        const { courses: searchResults } = searchLearningContent(processedCourses, searchQuery, {
            searchChapters: true,
            searchLessons: true,
            searchDescriptions: true
        });

        // Set search results and completed courses
        setFilteredCourses(searchResults);
        setCompletedCourses(
            searchResults.filter(course => course.progress.percentage === 100)
        );

        // Enable search mode if we have a query
        setIsSearchMode(searchQuery.trim().length > 0);
    }, [processedCourses, searchQuery]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4C9EFF" />
                    <Text>Loading courses...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Switch to courses tab for "Start Learning" button
    const handleStartLearning = () => {
        setActiveTab('courses');
    };

    // Clear search and exit search mode
    const handleClearSearch = () => {
        setSearchQuery('');
        setIsSearchMode(false);
        Keyboard.dismiss();
    };

    // Handle search result selection
    const handleSearchResultPress = (result) => {
        // Clear search after navigating
        setSearchQuery('');
        setIsSearchMode(false);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <StatusBar backgroundColor="#D0F3DA" barStyle="dark-content" />
                <Common />

                <Text style={styles.pageTitle}>Explore</Text>

                {/* Tab navigation - hidden in search mode */}
                {!isSearchMode && (
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'courses' && styles.activeTab
                            ]}
                            onPress={() => setActiveTab('courses')}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === 'courses' && styles.activeTabText
                            ]}>
                                Courses
                            </Text>
                            {activeTab === 'courses' && <View style={styles.activeTabIndicator} />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'completed' && styles.activeTab
                            ]}
                            onPress={() => setActiveTab('completed')}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === 'completed' && styles.activeTabText
                            ]}>
                                Completed {completedCourses.length > 0 && `(${completedCourses.length})`}
                            </Text>
                            {activeTab === 'completed' && <View style={styles.activeTabIndicator} />}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Enhanced Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={isSearchMode ?
                                "Search for courses, chapters or lessons" :
                                activeTab === 'courses' ?
                                    "Search for signs or collections" :
                                    "Search completed courses"
                            }
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => searchQuery.trim().length > 0 && setIsSearchMode(true)}
                            clearButtonMode="while-editing"
                        />
                        {isSearchMode && (
                            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                                <MaterialIcons name="close" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Content display based on mode and tab */}
                <View style={styles.contentContainer}>
                    {isSearchMode ? (
                        <SearchResults
                            courses={processedCourses}
                            searchQuery={searchQuery}
                            onResultPress={handleSearchResultPress}
                        />
                    ) : activeTab === 'courses' ? (
                        <AllCourses
                            courses={filteredCourses}
                            searchQuery={searchQuery}
                        />
                    ) : (
                        <CompletedCourses
                            courses={completedCourses}
                            searchQuery={searchQuery}
                            onStartLearning={handleStartLearning}
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#D0F3DA',
    },
    container: {
        flex: 1,
        padding: 25,
    },
    contentContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333333',
    },
    searchContainer: {
        marginBottom: 16,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDDDDD',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333333',
        padding: 8,
    },
    clearButton: {
        padding: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    tab: {
        paddingVertical: 12,
        marginRight: 24,
        position: 'relative',
    },
    activeTab: {
        position: 'relative',
    },
    tabText: {
        fontSize: 16,
        color: '#999999',
    },
    activeTabText: {
        color: '#155658',
        fontWeight: 'bold',
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: '#155658',
        borderRadius: 3,
    },
    searchModeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#E3F2FD',
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    searchModeText: {
        color: '#1976D2',
        marginLeft: 8,
        fontSize: 14,
    }
});