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
} from "react-native";
import { useRouter } from "expo-router";
import { UserDetailContext } from "../../context/UserDetailContext"; // Import the context directly
import { useVideo } from "../../context/VideoContext";
import { doc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import Common from "../../Components/Container/Common";
import InProgressCourses from "../../Components/Home/InProgressCourses";
import NewCourses from "../../Components/Home/NewCourses";

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
    const [greeting, setGreeting] = useState("Good Morning");
    const [refreshing, setRefreshing] = useState(false);

    // Set appropriate greeting based on time of day
    useEffect(() => {
        const currentHour = new Date().getHours();
        if (currentHour < 12) {
            setGreeting("Good Morning");
        } else if (currentHour < 18) {
            setGreeting("Good Afternoon");
        } else {
            setGreeting("Good Evening");
        }
    }, []);

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

                {/* User Greeting */}
                <View style={styles.greetingContainer}>
                    <Text style={styles.greeting}>{greeting},</Text>
                    <Text style={styles.userName}>{userDetail?.name || "Friend"}</Text>
                    <Text style={styles.startedText}>Let's Get Started!</Text>
                </View>

                {/* Progress Section */}
                <View style={styles.sectionContainer}>
                    <InProgressCourses courses={inProgressCourses} />
                    <NewCourses courses={notStartedCourses} />
                </View>

                {/* Feature Cards */}
                <View style={styles.featureCardsContainer}>
                    {/* Sign to Text Card */}
                    <TouchableOpacity
                        style={[styles.featureCard, styles.signToTextCard]}
                        onPress={() => router.push("/(tabs)/signToText")}
                    >
                        <View style={styles.featureCardContent}>
                            <Text style={styles.featureCardTitle}>Sign language - to- Text</Text>
                        </View>
                        <Image
                            source={require("../../assets/images/signtext.png")}
                            style={styles.featureCardImage}
                        />
                    </TouchableOpacity>

                    {/* Text to Sign Card */}
                    <TouchableOpacity
                        style={[styles.featureCard, styles.textToSignCard]}
                        onPress={() => router.push("/(tabs)/textToSign")}
                    >
                        <View style={styles.featureCardContent}>
                            <Text style={styles.featureCardTitle}>Text - to - Sign language</Text>
                        </View>
                        <Image
                            source={require("../../assets/images/textsign.png")}
                            style={styles.featureCardImage}
                        />
                    </TouchableOpacity>
                </View>

                {/* Saved Conversations */}
                {recentConversations.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Saved Conversations</Text>
                        <View style={styles.conversationsContainer}>
                            {recentConversations.map((conversation, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.conversationCard}
                                    onPress={() =>
                                        router.push({
                                            pathname: "/(tabs)/textToSign",
                                            params: {
                                                text: conversation.text,
                                                translated: conversation.translated,
                                                language: conversation.language,
                                                fromSaved: true
                                            }
                                        })
                                    }
                                >
                                    <Text
                                        style={styles.conversationText}
                                        numberOfLines={2}
                                        ellipsizeMode="tail"
                                    >
                                        {conversation.text}
                                    </Text>
                                    <Text style={styles.conversationDate}>
                                        {new Date(conversation.timestamp).toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
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
        paddingBottom: 80, // Extra padding for tab bar
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
    sectionContainer: {
        marginTop: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000",
        marginBottom: 12,
    },
    featureCardsContainer: {
        marginTop: 25,
    },
    featureCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        borderRadius: 16,
        marginBottom: 15,
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
    conversationDate: {
        fontSize: 12,
        color: "#999",
        marginTop: 5,
        textAlign: "right",
    },
});