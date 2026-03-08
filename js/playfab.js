const PlayFabService = {
    titleId: "1755C1",
    playFabId: null,

    initPlayFab: function () {
        if (typeof PlayFab === 'undefined') {
            console.error("PlayFab SDK is not loaded!");
            return;
        }
        PlayFab.settings.titleId = this.titleId;
        this.login();
    },

    getOrCreateUUID: function () {
        let uuid = localStorage.getItem("9ability_uuid");
        if (!uuid) {
            uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            localStorage.setItem("9ability_uuid", uuid);
        }
        return uuid;
    },

    login: function () {
        const customId = this.getOrCreateUUID();
        const loginRequest = {
            TitleId: this.titleId,
            CustomId: customId,
            CreateAccount: true
        };

        PlayFabClientSDK.LoginWithCustomID(loginRequest, (result, error) => {
            if (result !== null) {
                this.playFabId = result.data.PlayFabId;
                console.log("PlayFab Login Successful. PlayFabId: " + this.playFabId);
            } else if (error !== null) {
                console.error("PlayFab Login Failed", error);
            }
        });
    },

    submitScoreAndData: function (stage, gridSlots, callback) {
        if (!this.playFabId) {
            if (callback) callback();
            return;
        }

        // Fetch current rank to check if we beat our high score before overriding user data
        this.getPlayerRank((rankData, rankError) => {
            let isNewRecord = true;
            if (!rankError && rankData) {
                // rankData.StatValue contains the player's current high score
                if (stage <= rankData.StatValue) {
                    isNewRecord = false;
                }
            }

            // Submit Score to DailyRanking
            const requestStat = {
                Statistics: [{
                    StatisticName: "DailyRanking",
                    Value: stage
                }]
            };

            PlayFabClientSDK.UpdatePlayerStatistics(requestStat, (statResult, statError) => {
                if (statError) {
                    console.error("Error updating statistics", statError);
                    if (callback) callback();
                    return;
                }

                console.log("Score submitted successfully:", stage);

                if (isNewRecord) {
                    // Submit Abilities configuration
                    const abilitiesIds = gridSlots.map(a => a ? a.id : null);
                    const requestData = {
                        Data: {
                            "Abilities": JSON.stringify(abilitiesIds)
                        },
                        Permission: "Public"
                    };

                    PlayFabClientSDK.UpdateUserData(requestData, (dataResult, dataError) => {
                        if (dataError) console.error("Error updating user data", dataError);
                        else console.log("Abilities data updated for new high score!");
                        if (callback) callback();
                    });
                } else {
                    console.log("Score did not exceed current high score. Abilities data not updated.");
                    if (callback) callback();
                }
            });
        });
    },

    getLeaderboard: function (callback) {
        const request = {
            StatisticName: "DailyRanking",
            StartPosition: 0,
            MaxResultsCount: 15,
            ProfileConstraints: {
                ShowDisplayName: true
            }
        };

        PlayFabClientSDK.GetLeaderboard(request, (result, error) => {
            if (error) {
                console.error("Failed to fetch leaderboard", error);
                if (callback) callback(null, error);
                return;
            }
            if (callback) callback(result.data.Leaderboard, null);
        });
    },

    getUserData: function (playFabId, callback) {
        const request = {
            PlayFabId: playFabId,
            Keys: ["Abilities"]
        };

        PlayFabClientSDK.GetUserData(request, (result, error) => {
            if (error) {
                console.error("Failed to fetch user data for", playFabId, error);
                if (callback) callback(null, error);
                return;
            }
            if (callback) callback(result.data.Data, null);
        });
    },

    getPlayerRank: function (callback) {
        if (!this.playFabId) return;

        const request = {
            StatisticName: "DailyRanking",
            MaxResultsCount: 1,
            PlayFabId: this.playFabId
        };

        PlayFabClientSDK.GetLeaderboardAroundPlayer(request, (result, error) => {
            if (error) {
                console.error("Failed to get player rank", error);
                if (callback) callback(null, error);
                return;
            }
            if (callback) callback(result.data.Leaderboard[0], null);
        });
    }
};
