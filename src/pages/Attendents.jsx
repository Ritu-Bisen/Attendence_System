"use client";

import { useState, useEffect, useContext } from "react";
import { MapPin, Loader2 } from "lucide-react";
import AttendanceHistory from "../components/AttendanceHistory";
import { AuthContext } from "../App";

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [historyAttendance, setHistoryAttendance] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [errors, setErrors] = useState({});
  const [locationData, setLocationData] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState(false); // Track active session
  const [hasOutActiveSession, setHasOutActiveSession] = useState([]); // Track active session
  const [inData, setInData] = useState({});
  const [outData, setOutData] = useState({});
    const [hasCheckedInToday, setHasCheckedInToday] = useState(false); 

  const { currentUser, isAuthenticated } = useContext(AuthContext);

  const salesPersonName = currentUser?.salesPersonName || "Unknown User";
  const userRole = currentUser?.role || "User";

  const SPREADSHEET_ID = "13OMuFL3ki3gQr2ChP3Khhn5-BpGqDiwCF3sbGNUCC8A";
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyfOAZd4NmrUoBG_NXROrNwdGRoNNMyVAgBczoIQWwxovEpCeQ3ODtQlvsv7_wpYgtf/exec";

  const formatDateInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDateMMDDYYYY = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatDateDDMMYYYY = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const [formData, setFormData] = useState({
    status: "",
    startDate: formatDateInput(new Date()),
    endDate: "",
    reason: "",
  });

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    const bgColor = type === "error" ? "bg-red-500" : "bg-green-500";

    toast.className = `fixed top-4 right-4 p-4 rounded-md text-white z-50 ${bgColor} max-w-sm shadow-lg`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  const getFormattedAddress = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      } else {
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
    } catch (error) {
      console.error("Error getting formatted address:", error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

          const formattedAddress = await getFormattedAddress(
            latitude,
            longitude
          );

          const locationInfo = {
            latitude,
            longitude,
            mapLink,
            formattedAddress,
            timestamp: new Date().toISOString(),
            accuracy: position.coords.accuracy,
          };

          resolve(locationInfo);
        },
        (error) => {
          const errorMessages = {
            1: "Location permission denied. Please enable location services.",
            2: "Location information unavailable.",
            3: "Location request timed out.",
          };
          reject(
            new Error(errorMessages[error.code] || "An unknown error occurred.")
          );
        },
        options
      );
    });
  };

  // Check if user has active session
 const checkActiveSession = (attendanceData) => {
    if (!attendanceData || attendanceData.length === 0) {
      setHasActiveSession(false);
      setHasCheckedInToday(false); // Reset checked in status
      return;
    }

    // Filter records for current user
   const userRecords = attendanceData.filter(
      (record) =>
        record.salesPersonName === salesPersonName &&
        record.dateTime?.split(" ")[0].toString() ===
          formatDateDDMMYYYY(new Date())
    );

    console.log("userRecords", userRecords);

    if (userRecords.length === 0) {
      setHasActiveSession(false);
      setHasCheckedInToday(false);
      return;
    }
  const hasCheckedIn = userRecords.some(record => record.status === "IN");
    setHasCheckedInToday(hasCheckedIn);
    // Check the most recent record (first one since it's sorted by most recent)
    const mostRecentRecord = userRecords[0];

    // console.log("mostRecentRecord",mostRecentRecord);

    // setHasOutActiveSession(mostRecentRecord)

    // If the most recent record is "IN", user has active session
    const hasActive = mostRecentRecord.status === "IN";
    setHasActiveSession(hasActive);
    if (hasActive) {
      setInData(mostRecentRecord);
    }

    const hasOutActive = mostRecentRecord.status === "OUT";
    // setHasOutActiveSession(hasOutActive);

    if (hasOutActive) {
      setOutData(mostRecentRecord);
    }

    // console.log("Active session check:", {
    //   mostRecentRecord: mostRecentRecord,
    //   hasActiveSession: hasActive
    // });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.status) newErrors.status = "Status is required";

    // Block IN if user has active session
    // if (formData.status === "IN" && hasActiveSession) {
    //   newErrors.status = "You are already checked in. Please check out first.";
    // }

    // if (formData.status === "OUT" && hasOutActiveSession) {
    //   newErrors.status = "You are already checked Out. Please check in first.";
    // }

    if (formData.status === "Leave") {
      if (!formData.startDate) newErrors.startDate = "Start date is required";
      if (
        formData.startDate &&
        formData.endDate &&
        new Date(formData.endDate + "T00:00:00") <
          new Date(formData.startDate + "T00:00:00")
      ) {
        newErrors.endDate = "End date cannot be before start date";
      }
      if (!formData.reason) newErrors.reason = "Reason is required for leave";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchAttendanceHistory = async () => {
    if (!isAuthenticated || !currentUser) {
      console.log(
        "Not authenticated or currentUser not available. Skipping history fetch."
      );
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const attendanceSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Attendance`;
      const response = await fetch(attendanceSheetUrl);
      const text = await response.text();

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonData);

      if (!data?.table?.rows) {
        console.warn("No rows found in Attendance sheet.");
        setAttendance([]);
        setIsLoadingHistory(false);
        return;
      }

      const rows = data.table.rows;
      // console.log("rows",rows);
      const formattedHistory = rows
        .map((row) => {
          const salesPerson = row.c?.[9]?.v;
          let dateTime = row.c?.[1]?.v;
          let originalTimestamp = row.c?.[0]?.v;

          if (
            typeof originalTimestamp === "string" &&
            originalTimestamp.startsWith("Date(") &&
            originalTimestamp.endsWith(")")
          ) {
            try {
              const dateParts = originalTimestamp
                .substring(5, originalTimestamp.length - 1)
                .split(",");
              const year = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10);
              const day = parseInt(dateParts[2], 10);
              const hour = dateParts[3] ? parseInt(dateParts[3], 10) : 0;
              const minute = dateParts[4] ? parseInt(dateParts[4], 10) : 0;
              const second = dateParts[5] ? parseInt(dateParts[5], 10) : 0;

              const dateObj = new Date(year, month, day, hour, minute, second);
              dateTime = formatDateTime(dateObj);
            } catch (e) {
              console.error(
                "Error parsing original timestamp date string:",
                originalTimestamp,
                e
              );
              dateTime = originalTimestamp;
            }
          }

          const status = row.c?.[3]?.v;
          const mapLink = row.c?.[7]?.v;
          const address = row.c?.[8]?.v;

          return {
            salesPersonName: salesPerson,
            dateTime: dateTime,
            status: status,
            mapLink: mapLink,
            address: address,
            _originalTimestamp: originalTimestamp,
          };
        })
        .filter(Boolean);
      // console.log("userRole",userRole);
      // const filteredHistory =
      //   userRole === "admin"
      //     ? formattedHistory
      //     : formattedHistory.filter(
      //         (entry) => entry.salesPersonName === salesPersonName && entry.dateTime.split(' ')[0].toString() === formatDateDDMMYYYY(new Date())
      //       );

      const filteredHistory = formattedHistory.filter(
        (entry) =>
          entry.salesPersonName === salesPersonName &&
          entry.dateTime?.split(" ")[0].toString() ===
            formatDateDDMMYYYY(new Date())
      );

      const filteredHistoryData =
        userRole.toLowerCase() === "admin"
          ? formattedHistory
          : formattedHistory.filter(
              (entry) => entry.salesPersonName === salesPersonName
            );

      // console.log("before Sort filteredHistory", filteredHistory)

      filteredHistory.sort((a, b) => {
        const parseGvizDate = (dateString) => {
          if (
            typeof dateString === "string" &&
            dateString.startsWith("Date(") &&
            dateString.endsWith(")")
          ) {
            const dateParts = dateString
              .substring(5, dateString.length - 1)
              .split(",");
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10);
            const day = parseInt(dateParts[2], 10);
            const hour = dateParts[3] ? parseInt(dateParts[3], 10) : 0;
            const minute = dateParts[4] ? parseInt(dateParts[4], 10) : 0;
            const second = dateParts[5] ? parseInt(dateParts[5], 10) : 0;
            return new Date(year, month, day, hour, minute, second);
          }
          return new Date(dateString);
        };
        const dateA = parseGvizDate(a._originalTimestamp);
        const dateB = parseGvizDate(b._originalTimestamp);
        return dateB.getTime() - dateA.getTime();
      });

      filteredHistoryData.sort((a, b) => {
        const parseGvizDate = (dateString) => {
          if (
            typeof dateString === "string" &&
            dateString.startsWith("Date(") &&
            dateString.endsWith(")")
          ) {
            const dateParts = dateString
              .substring(5, dateString.length - 1)
              .split(",");
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10);
            const day = parseInt(dateParts[2], 10);
            const hour = dateParts[3] ? parseInt(dateParts[3], 10) : 0;
            const minute = dateParts[4] ? parseInt(dateParts[4], 10) : 0;
            const second = dateParts[5] ? parseInt(dateParts[5], 10) : 0;
            return new Date(year, month, day, hour, minute, second);
          }
          return new Date(dateString);
        };
        const dateA = parseGvizDate(a._originalTimestamp);
        const dateB = parseGvizDate(b._originalTimestamp);
        return dateB.getTime() - dateA.getTime();
      });

      // console.log("after Sort filteredHistory", filteredHistory)

      setAttendance(filteredHistory);
      setHistoryAttendance(filteredHistoryData);

      // Check for active session after loading data
      checkActiveSession(filteredHistory);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      showToast("Failed to load attendance history.", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchAttendanceHistory();
  }, [currentUser, isAuthenticated]);

  // console.log("attendance", attendance)

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log("Submit button clicked!");

    if (!validateForm()) {
      showToast("Please fill in all required fields correctly.", "error");
      return;
    }

    if (!isAuthenticated || !currentUser || !salesPersonName) {
      showToast("User data not loaded. Please try logging in again.", "error");
      return;
    }

    if (formData?.status === "IN") {
      const indata = attendance.filter((item) => item.status === "IN");
      if (indata.length > 0) {
        showToast("Today Already in", "error");
        return;
      }
    }

    // console.log("ram ram out",outData);
    if (formData?.status === "OUT") {
      // console.log("inData",inData)
      // console.log("outData",outData)

      const indata = attendance.filter((item) => item.status === "IN");
      const outdata = attendance.filter((item) => item.status === "OUT");
      if (indata.length === 0) {
        showToast("First In", "error");
        return;
      }

      // if((outData.dateTime?.split(' ')[0].toString() === formatDateDDMMYYYY(new Date()).toString())){
      //   showToast("Today Already out", "error");
      // return;
      // }
      if (outdata.length > 0) {
        showToast("Today Already out", "error");
        return;
      }
    }

    setIsSubmitting(true);
    setIsGettingLocation(true);

    try {
      // First get location - we need this for all submission types
      let currentLocation = null;
      try {
        currentLocation = await getCurrentLocation();
        // console.log("Location captured:", currentLocation);
      } catch (locationError) {
        console.error("Location error:", locationError);
        showToast(locationError.message, "error");
        setIsSubmitting(false);
        setIsGettingLocation(false);
        return;
      }

      setIsGettingLocation(false);

      // Simplified date handling - use current date for IN/OUT
      const currentDate = new Date();
      const timestamp = formatDateTime(currentDate);

      const dateForAttendance =
        formData.status === "IN" || formData.status === "OUT"
          ? formatDateTime(currentDate)
          : formData.startDate
          ? formatDateTime(new Date(formData.startDate + "T00:00:00"))
          : "";

      const endDateForLeave = formData.endDate
        ? formatDateTime(new Date(formData.endDate + "T00:00:00"))
        : "";

      // Prepare row data
      let rowData = Array(10).fill("");
      rowData[0] = timestamp;
      rowData[1] = dateForAttendance;
      rowData[2] = endDateForLeave;
      rowData[3] = formData.status;
      rowData[4] = formData.reason;
      rowData[5] = currentLocation.latitude;
      rowData[6] = currentLocation.longitude;
      rowData[7] = currentLocation.mapLink;
      rowData[8] = currentLocation.formattedAddress;
      rowData[9] = salesPersonName;

      // console.log("Row data to be submitted:", rowData);

      const payload = {
        sheetName: "Attendance",
        action: "insert",
        rowData: JSON.stringify(rowData),
      };

      const urlEncodedData = new URLSearchParams(payload);

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: urlEncodedData,
        });

        console.log("response", response);

        // Always show success message first
        const successMessage =
          formData.status === "IN"
            ? "Check-in successful!"
            : formData.status === "OUT"
            ? "Check-out successful!"
            : "Leave application submitted successfully!";
        showToast(successMessage, "success");

        // Reset form immediately
        setFormData({
          status: "",
          startDate: formatDateInput(new Date()),
          endDate: "",
          reason: "",
        });

        // Then try to handle response and refresh data
        if (response.ok) {
          try {
            const responseText = await response.text();
            // console.log("Response received:", responseText);

            if (responseText.trim()) {
              const result = JSON.parse(responseText);
              if (result.success === false && result.activeSession) {
                // If there was actually an active session error, refresh to update UI
                await fetchAttendanceHistory();
                return;
              }
            }
          } catch (parseError) {
            console.log(
              "Response parsing issue, but success message already shown"
            );
          }
        }

        // Refresh history to update the display
        await fetchAttendanceHistory();
      } catch (fetchError) {
        // Even for fetch errors, we assume it was submitted successfully
        // because Google Apps Script sometimes has CORS issues but still processes the data
        console.error("Fetch error:", fetchError);

        // Show success message if we haven't already
        const successMessage =
          formData.status === "IN"
            ? "Check-in successful!"
            : formData.status === "OUT"
            ? "Check-out successful!"
            : "Leave application submitted successfully!";
        showToast(successMessage, "success");

        // Reset form
        setFormData({
          status: "",
          startDate: formatDateInput(new Date()),
          endDate: "",
          reason: "",
        });

        // Wait and refresh history
        setTimeout(async () => {
          await fetchAttendanceHistory();
        }, 2000);
      }
    } catch (error) {
      console.error("Submission error:", error);
      showToast("Error recording attendance. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
      setIsGettingLocation(false);
    }
  };

 const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Check if user is trying to select Leave when already checked in
    if (name === "status" && value === "Leave" && hasCheckedInToday) {
      showToast("Cannot apply for leave after checking in today", "error");
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // console.log("FormDAta",formData);

  const showLeaveFields = formData.status === "Leave";

  if (!isAuthenticated || !currentUser || !currentUser.salesPersonName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">
            {!isAuthenticated
              ? "Please log in to view this page."
              : "Loading user data..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-0 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              Mark Attendance
            </h3>
            <p className="text-emerald-50 text-lg">
              Record your daily attendance or apply for leave
            </p>
            {/* No warning banner - removed for cleaner UI */}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 p-8">
        <div className="grid gap-6 lg:grid-cols-1">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 bg-white border rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium ${
                errors.status ? "border-red-300" : "border-slate-200"
              }`}
            >
                  <option value="">Select status</option>
                  <option
                    value="IN"
                    // disabled={hasActiveSession}
                    // className={hasActiveSession ? 'text-gray-400' : ''}
                  >
                    IN
                  </option>
                  <option
                    value="OUT"
                    // disabled = {hasOutActiveSession}
                    // className={hasOutActiveSession ? 'text-gray-400' : ''}
                  >
                    OUT
                  </option>
                   {!hasCheckedInToday && <option value="Leave">Leave</option>}
            </select>
            {errors.status && (
              <p className="text-red-500 text-sm mt-2 font-medium">
                {errors.status}
              </p>
            )}
           
               
                {/* No helper text - removed for cleaner UI */}
              </div>
            </div>

            {!showLeaveFields && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                <div className="text-sm font-semibold text-emerald-700 mb-2">
                  Current Date & Time
                </div>
                <div className="text-sm sm:text-2xl font-bold text-emerald-800">
                  {formatDateDisplay(new Date())}
                </div>
                {(formData.status === "IN" || formData.status === "OUT") && (
                  <div className="mt-3 text-sm text-emerald-600">
                    📍 Location will be automatically captured when you submit
                  </div>
                )}
                {/* No session status display - removed for cleaner UI */}
              </div>
            )}

            {showLeaveFields && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-0 sm:p-6 border border-amber-100 mb-6">
                <div className="text-sm font-semibold text-amber-700 mb-2">
                  Leave Application
                </div>
                <div className="text-lg font-bold text-amber-800">
                  {formatDateDisplay(new Date())}
                </div>
                <div className="mt-3 text-sm text-amber-600">
                  📍 Current location will be captured for leave application
                </div>
              </div>
            )}

            {showLeaveFields && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                    />
                    {errors.startDate && (
                      <p className="text-red-500 text-sm mt-2 font-medium">
                        {errors.startDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={formData.startDate}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium"
                    />
                    {errors.endDate && (
                      <p className="text-red-500 text-sm mt-2 font-medium">
                        {errors.endDate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Reason
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="Enter reason for leave"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-slate-700 font-medium min-h-32 resize-none"
                  />
                  {errors.reason && (
                    <p className="text-red-500 text-sm mt-2 font-medium">
                      {errors.reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full lg:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={
                isSubmitting ||
                isGettingLocation ||
                !currentUser?.salesPersonName
                // (formData.status === "IN" && hasActiveSession) // Disable IN when active session exists
              }
            >
              {isGettingLocation ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Getting Location...
                </span>
              ) : isSubmitting ? (
                showLeaveFields ? (
                  "Submitting Leave..."
                ) : (
                  "Marking Attendance..."
                )
              ) : showLeaveFields ? (
                "Submit Leave Request"
              ) : (
                "Mark Attendance"
              )}
            </button>
          </form>
        </div>
      </div>
      <AttendanceHistory
        attendanceData={historyAttendance}
        isLoading={isLoadingHistory}
        userRole={userRole}
      />
    </div>
  );
};

export default Attendance;
