// Frontend/app/(tabs)/home.jsx
import React, { useState, useEffect, useCallback, useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { UserDetailContext } from "../../context/UserDetailContext";
import { useVideo } from "../../context/VideoContext";
import { doc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import Common from "../../Components/Container/Common";
import InProgressCourses from "../../Components/Home/InProgressCourses";
import NewCourses from "../../Components/Home/NewCourses";
import Header from "../../Components/Home/Header";
import WelcomeCard from "../../Components/Home/WelcomeCard"; // Import WelcomeCard
import { MaterialIcons } from "@expo/vector-icons";

export default function Home() {
    const router = useRouter();

    // Use direct context access with fallback for when context is missing
    const userDetailContext = useContext(UserDetailContext);
    const userDetail = userDetailContext?.userDetail || { name: "Friend" };

    // Check if video context exists and provide fallbacks
    let videoContext;
    try {
        videoContext = useVideo();
    } catch (error) {
        console.warn("Video context not available:", error.message);
        videoContext = {
            coursesData: [],
            getCoursesWithProgress: () => []
        };
    }

    const { coursesData, getCoursesWithProgress } = videoContext;

    const [inProgressCourses, setInProgressCourses] = useState([]);
    const [notStartedCourses, setNotStartedCourses] = useState([]);
    const [recentConversations, setRecentConversations] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Load data function that can be called on initial load and refresh
    const loadData = useCallback(async () => {
        // Handle potential missing context
        if (!getCoursesWithProgress) {
            console.warn("getCoursesWithProgress not available");
            return;
        }

        // Process courses and categorize them
        if (coursesData && coursesData.length > 0) {
            try {
                // Get all courses with progress
                const coursesWithProgress = getCoursesWithProgress();

                // Categorize courses into in-progress and not started
                const inProgress = [];
                const notStarted = [];

                coursesWithProgress.forEach(course => {
                    if (course.progress && course.progress.completed > 0) {
                        inProgress.push(course);
                    } else {
                        notStarted.push(course);
                    }
                });

                // Sort in-progress courses by completion percentage (descending)
                inProgress.sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0));

                setInProgressCourses(inProgress);
                setNotStartedCourses(notStarted);
            } catch (error) {
                console.error("Error processing courses:", error);
            }
        }

        // Load recent conversations
        if (auth && auth.currentUser) {
            try {
                const conversationsRef = collection(db, "users", auth.currentUser.uid, "conversations");
                const q = query(conversationsRef, orderBy("timestamp", "desc"), limit(3));
                const querySnapshot = await getDocs(q);

                const conversations = [];
                querySnapshot.forEach(doc => {
                    conversations.push(doc.data());
                });

                setRecentConversations(conversations);
            } catch (error) {
                console.error("Error loading conversations:", error);
            }
        }
    }, [coursesData, getCoursesWithProgress]);

    // Load data on initial mount
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#D0F3DA" barStyle="dark-content" />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#155658"]}
                        tintColor={"#155658"}
                    />
                }
            >
                <Common />

                <Header />

                {/* Saved Translations Button */}
                <TouchableOpacity
                    style={styles.savedButton}
                    onPress={() => router.push("/saveSign/savedTranslations")}
                >
                    <MaterialIcons name="history" size={20} color="#155658" />
                    <Text style={styles.savedButtonText}>View Saved Translations</Text>
                </TouchableOpacity>

                {/* Progress Section - Show WelcomeCard for new users */}
                <View style={styles.sectionContainer}>
                    {inProgressCourses.length > 0 ? (
                        <InProgressCourses courses={inProgressCourses} />
                    ) : (
                        <WelcomeCard />
                    )}
                    <NewCourses courses={notStartedCourses} />
                </View>

                {/* Feature Cards */}
                <View style={styles.featureCardsContainer}>
                    {/* Sign to Text Card */}
                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)/signToText")}
                        style={styles.card}
                    >
                        <ImageBackground
                            source={require("../../assets/images/sign.png")}
                            style={styles.container}
                            resizeMode="cover"
                        >
                            <View style={styles.contentContainerCard}>
                                <Text style={styles.featureCardTitle}>Sign language - to- Text</Text>
                            </View>
                        </ImageBackground>
                    </TouchableOpacity>

                    {/* Text to Sign Card */}
                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)/textToSign")}
                        style={styles.card}
                    >
                        <ImageBackground
                            source={require("../../assets/images/text.png")}
                            style={styles.container}
                            resizeMode="cover"
                        >
                            <View style={styles.contentContainerCard}>
                                <Text style={styles.featureCardTitle}>Text - to - Sign language</Text>
                            </View>
                        </ImageBackground>
                    </TouchableOpacity>
                </View>

                {/* Recent Conversations Section */}
                {recentConversations.length > 0 && (
                    <View style={styles.conversationsContainer}>
                        <Text style={styles.sectionTitle}>Recent Conversations</Text>
                        {recentConversations.map((conversation, index) => (
                            <View key={index} style={styles.conversationCard}>
                                <Text style={styles.conversationText}>
                                    {conversation.text}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#D0F3DA",
    },
    container: {
        flex: 1,
        padding: 25,
    },
    contentContainer: {
        paddingBottom: 100, // Extra padding for tab bar
    },
    contentContainerCard: {
        paddingBottom: 65, // Extra padding for tab bar
    },
    greetingContainer: {
        marginTop: 10,
    },
    greeting: {
        fontSize: 16,
        color: "#666",
    },
    userName: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#000",
        marginTop: 5,
    },
    startedText: {
        fontSize: 16,
        color: "#333",
        marginTop: 5,
    },
    savedButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E0F2F1",
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 20,
        alignSelf: "flex-start",
        marginTop: -70,
        marginBottom: 45,
        marginLeft: 155
    },
    savedButtonText: {
        color: "#155658",
        marginLeft: 8,
        fontWeight: "500",
    },
    sectionContainer: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000",
        marginBottom: 12,
    },
    featureCardsContainer: {
        //marginTop: 25,
        //marginBottom: 30
    },
    signToTextCard: {
        backgroundColor: "#155658",
    },
    textToSignCard: {
        backgroundColor: "#155658",
    },
    featureCardContent: {
        flex: 1,
    },
    featureCardTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
        paddingRight: 10,
        top: 45
    },
    featureCardImage: {
        width: 80,
        height: 80,
        resizeMode: "contain",
    },
    conversationsContainer: {
        marginTop: 5,
    },
    conversationCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    conversationText: {
        fontSize: 14,
        color: "#333",
    },
    card: {
        marginTop: -5
    }
});