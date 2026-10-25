const { useState, useEffect, useMemo } = React;
import Wizard from './components/Wizard.jsx';
import PositioningStage from './components/PositioningStage.jsx';
import StoryStage from './components/StoryStage.jsx';
import VideoStage from './components/VideoStage.jsx';
import { LoadingScreen, ErrorScreen } from './components/StatusScreens.jsx';
import { generateGeminiStory } from './services/aiService.js';
import { soundService } from './services/ttsService.js';

export default function App() {
    const urlKey = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('key') || params.get('apikey');
    }, []);

    const [apiKey, setApiKey] = useState(() => urlKey?.trim() || localStorage.getItem('gemini_story_key') || '');
    const [players, setPlayers] = useState(() => JSON.parse(localStorage.getItem('gemini_story_players') || '[]'));
    const [selectedCharacters, setSelectedCharacters] = useState(() => JSON.parse(localStorage.getItem('gemini_story_selected_chars') || '[]'));
    const [difficulty, setDifficulty] = useState('facil');

    const [gameState, setGameState] = useState('setup');
    const [storyData, setStoryData] = useState(null);
    const [positionIndex, setPositionIndex] = useState(0);
    const [storyIndex, setStoryIndex] = useState(0);
    const [videoSceneUrl, setVideoSceneUrl] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (apiKey) localStorage.setItem('gemini_story_key', apiKey.trim());
    }, [apiKey]);

    useEffect(() => {
        localStorage.setItem('gemini_story_players', JSON.stringify(players));
    }, [players]);

    useEffect(() => {
        localStorage.setItem('gemini_story_selected_chars', JSON.stringify(selectedCharacters));
    }, [selectedCharacters]);

    const handleStartGame = async () => {
        setGameState('loading');
        setErrorMessage('');
        try {
            const data = await generateGeminiStory({ players, selectedCharacters, apiKey });
            setStoryData(data);
            setPositionIndex(0);
            setStoryIndex(0);
            setGameState('positioning');
        } catch (err) {
            console.error(err);
            setErrorMessage(err.message || 'Error al conectar con Gemini API.');
            setGameState('error');
        }
    };

    const handleNextPosition = () => {
        if (positionIndex < storyData.initial_positions.length - 1) {
            setPositionIndex(prev => prev + 1);
        } else {
            setGameState('story');
        }
    };

    const handleAdvanceStory = () => {
        soundService.stopAll();
        if (storyIndex < storyData.story.length - 1) {
            setStoryIndex(prev => prev + 1);
        } else {
            setGameState('generating_video');
            const promptQuery = encodeURIComponent('Disney Pixar style 3D cartoon, Mickey Mouse Clubhouse celebration, happy children playing, magical glowing lights, storybook finish --width 800 --height 500');
            const sceneUrl = `https://image.pollinations.ai/prompt/${promptQuery}?nologo=true`;

            const img = new Image();
            img.src = sceneUrl;
            img.onload = () => {
                setVideoSceneUrl(sceneUrl);
                setGameState('video');
            };
            img.onerror = () => {
                setGameState('setup');
            };
        }
    };

    if (gameState === 'loading') {
        return <LoadingScreen message="Creando la aventura mágica..." submessage="Repartiendo los turnos entre los jugadores estrella." />;
    }

    if (gameState === 'generating_video') {
        return <LoadingScreen message="Creando el video final mágico..." submessage="¡Pintando la moraleja de la historia!" />;
    }

    if (gameState === 'error') {
        return <ErrorScreen error={errorMessage} onRetry={() => setGameState('setup')} />;
    }

    if (gameState === 'positioning' && storyData) {
        return <PositioningStage storyData={storyData} currentIndex={positionIndex} onNext={handleNextPosition} />;
    }

    if (gameState === 'story' && storyData) {
        return (
            <StoryStage
                storyData={storyData}
                currentIndex={storyIndex}
                difficulty={difficulty}
                apiKey={apiKey}
                onAdvance={handleAdvanceStory}
            />
        );
    }

    if (gameState === 'video' && storyData) {
        return (
            <VideoStage
                videoUrl={videoSceneUrl}
                moral={storyData.moral}
                apiKey={apiKey}
                onReset={() => setGameState('setup')}
            />
        );
    }

    return (
        <Wizard
            apiKey={apiKey}
            onSaveKey={setApiKey}
            isUrlKey={!!urlKey}
            players={players}
            setPlayers={setPlayers}
            selectedCharacters={selectedCharacters}
            setSelectedCharacters={setSelectedCharacters}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            onStartGame={handleStartGame}
        />
    );
}