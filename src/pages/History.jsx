"use client";

import { useState, useEffect, useContext } from "react";
import { MapPin, Eye, Loader2, ChevronDown, ChevronUp, Calendar, Search, X } from "lucide-react";
import { AuthContext } from "../App";

const TravelHistory = () => {
  const [travels, setTravels] = useState([]);
  const [filteredTravels, setFilteredTravels] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);

  const { currentUser, isAuthenticated } = useContext(AuthContext);

  const salesPersonName = currentUser?.salesPersonName || "Unknown User";
  const userRole = currentUser?.role || "User";

  const SPREADSHEET_ID = "13OMuFL3ki3gQr2ChP3Khhn5-BpGqDiwCF3sbGNUCC8A";

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 p-4 rounded-md text-white z-50 ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString.toString().trim() === "") return "-";
    
    try {
      const dateStr = dateString.toString();
      
      // Handle Google Sheets Date(YYYY,M,D) format
      if (dateStr.startsWith('Date(') && dateStr.endsWith(')')) {
        const dateContent = dateStr.substring(5, dateStr.length - 1);
        const parts = dateContent.split(',').map(part => parseInt(part.trim()));
        if (parts.length === 3) {
          const [year, month, day] = parts;
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            const formattedDay = String(date.getDate()).padStart(2, '0');
            const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
            const formattedYear = String(date.getFullYear()).slice(-2);
            return `${formattedDay}/${formattedMonth}/${formattedYear}`;
          }
        }
      }

      // Try parsing as Excel serial date first
      if (!isNaN(dateString)) {
        const excelSerialDate = parseInt(dateString);
        if (excelSerialDate > 0) {
          const date = new Date((excelSerialDate - 25569) * 86400 * 1000);
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            return `${day}/${month}/${year}`;
          }
        }
      }

      // Handle MM/DD/YYYY format from Google Apps Script
      const parts = dateString.toString().split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const date = new Date(year > 99 ? year : 2000 + year, month, day);
          if (!isNaN(date.getTime())) {
            const formattedDay = String(date.getDate()).padStart(2, '0');
            const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
            const formattedYear = String(date.getFullYear()).slice(-2);
            return `${formattedDay}/${formattedMonth}/${formattedYear}`;
          }
        } else if (day >= 1 && day <= 12 && month >= 1 && month <= 31) {
          const date = new Date(year > 99 ? year : 2000 + year, day, month);
          if (!isNaN(date.getTime())) {
            const formattedDay = String(date.getDate()).padStart(2, '0');
            const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
            const formattedYear = String(date.getFullYear()).slice(-2);
            return `${formattedDay}/${formattedMonth}/${formattedYear}`;
          }
        }
      }

      // Try parsing as ISO date string
      let date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
      }

      return dateString.toString();
    } catch (e) {
      console.warn("Date formatting error:", e);
      return dateString.toString();
    }
  };

  // Convert DD/MM/YY to Date object for comparison
  const parseTravelDate = (dateStr) => {
    if (!dateStr || dateStr === "-") return null;
    
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Months are 0-indexed
        const year = parseInt(parts[2]) + 2000; // Assuming YY format, convert to YYYY
        
        return new Date(year, month, day);
      }
      return null;
    } catch (e) {
      console.warn("Error parsing travel date:", e);
      return null;
    }
  };

  const normalizeDate = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const applyDateFilter = () => {
  if (!filterStartDate && !filterEndDate) {
    setFilteredTravels(travels);
    setIsFiltering(false);
    return;
  }

  const startDate = filterStartDate ? normalizeDate(new Date(filterStartDate)) : null;
  const endDate = filterEndDate ? normalizeDate(new Date(filterEndDate)) : null;

  const filtered = travels.filter(travel => {
    const travelDate = parseTravelDate(travel.travelDate);
    if (!travelDate) return false;

    const normalizedTravelDate = normalizeDate(travelDate);

    if (startDate && endDate) {
      // inclusive range (includes start and end)
      return normalizedTravelDate >= startDate && normalizedTravelDate <= endDate;
    } else if (endDate) {
      // only end date → match exactly that date
      return normalizedTravelDate.getTime() === endDate.getTime();
    } else {
      // only start date → no filter
      return true;
    }
  });

  setFilteredTravels(filtered);
  setIsFiltering(true);
};





  const clearFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilteredTravels(travels);
    setIsFiltering(false);
  };

  // Apply filter automatically when dates change
useEffect(() => {
  applyDateFilter();
}, [ filterEndDate]);


  const fetchTravelHistory = async () => {
    if (!isAuthenticated || !currentUser) {
      console.log("Not authenticated or currentUser not available. Skipping history fetch.");
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const travelSheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Travelling`;
      const response = await fetch(travelSheetUrl);
      const text = await response.text();

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonData);

      if (!data?.table?.rows) {
        console.warn("No rows found in Travelling sheet.");
        setTravels([]);
        setFilteredTravels([]);
        setIsLoadingHistory(false);
        return;
      }

      // Skip the header row (first row)
      const rows = data.table.rows.slice(1);
      const formattedHistory = rows.map((row, index) => {
        const timestamp = row.c?.[0]?.v;
        const personName = row.c?.[1]?.v;
        const fromLocation = row.c?.[2]?.v;
        const toLocation = row.c?.[3]?.v;
        const vehicleType = row.c?.[4]?.v;
        const noOfDays = row.c?.[5]?.v;
        const accommodationType = row.c?.[6]?.v;
        const travelDate = row.c?.[7]?.v;
        const stayBillLink = row.c?.[8]?.v;
        const foodingDates = row.c?.[9]?.v;
        const foodingBillLinks = row.c?.[10]?.v;
        const travelReceiptLink = row.c?.[11]?.v;
        const localTravelType = row.c?.[12]?.v;
        const localTravelReceiptLink = row.c?.[13]?.v;
        const returnDate = row.c?.[14]?.v;
        const returnTicketLink = row.c?.[15]?.v;
        const advanceAmount = row.c?.[16]?.v;

        let parsedFoodingData = [];
        if (foodingDates && foodingBillLinks) {
          try {
            const dates = foodingDates.toString().split(',').map(d => formatDate(d.trim())).filter(d => d && d !== "-");
            const links = foodingBillLinks.toString().split(',').map(l => l.trim()).filter(l => l);
            
            const minLength = Math.min(dates.length, links.length);
            for (let i = 0; i < minLength; i++) {
              if (dates[i] && links[i]) {
                parsedFoodingData.push({
                  date: dates[i],
                  billLink: links[i]
                });
              }
            }
          } catch (e) {
            console.warn("Error parsing fooding data:", e);
          }
        }

        return {
          timestamp,
          personName,
          fromLocation,
          toLocation,
          vehicleType,
          noOfDays,
          accommodationType,
          travelDate: formatDate(travelDate),
          stayBillLink,
          stayBillUploaded: stayBillLink ? "Yes" : "No",
          foodingData: parsedFoodingData,
          foodingBillsCount: parsedFoodingData.length,
          travelReceiptLink,
          travelReceiptUploaded: travelReceiptLink ? "Yes" : "No",
          localTravelType,
          localTravelReceiptLink,
          localTravelReceiptUploaded: localTravelReceiptLink ? "Yes" : "No",
          returnDate: formatDate(returnDate),
          returnTicketLink,
          returnTicketUploaded: returnTicketLink ? "Yes" : "No",
          advanceAmount,
          originalIndex: index
        };
      }).filter(Boolean);

      const filteredHistory =
        userRole === "admin"
          ? formattedHistory
          : formattedHistory.filter(
              (entry) => entry.personName === salesPersonName
            );

      filteredHistory.sort((a, b) => {
        return b.originalIndex - a.originalIndex;
      });

      setTravels(filteredHistory);
      setFilteredTravels(filteredHistory);
    } catch (error) {
      console.error("Error fetching travel history:", error);
      showToast("Failed to load travel history.", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTravelHistory();
  }, [currentUser, isAuthenticated]);

  const viewBillLink = (link) => {
    if (link && typeof link === 'string') {
      window.open(link, '_blank');
    } else {
      showToast("Bill link not available.", "error");
    }
  };

  const viewFoodingBill = (billLink) => {
    if (billLink && typeof billLink === 'string') {
      window.open(billLink, '_blank');
    } else {
      showToast("Bill link not available.", "error");
    }
  };

  const toggleRowExpansion = (index) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderFileUploadStatus = (uploaded, link, label) => {
    if (uploaded === "Yes") {
      return (
        <button
          onClick={() => viewBillLink(link)}
          className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </button>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
        Not uploaded
      </span>
    );
  };

  if (!isAuthenticated || !currentUser || !currentUser.salesPersonName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">
            {!isAuthenticated
              ? "Please log in to view this page."
              : "Loading user data..."}
          </p>
        </div>
      </div>
    );
  }

  const displayTravels = isFiltering ? filteredTravels : travels;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">Travel History</h1>
                <p className="text-blue-100 mt-1">View all your travel records and expenses</p>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by Date:</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">From:</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">To:</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                {(filterStartDate || filterEndDate) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filter Results Info */}
            {isFiltering && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  Showing {filteredTravels.length} of {travels.length} records
                  {filterStartDate && ` from ${new Date(filterStartDate).toLocaleDateString()}`}
                  {filterEndDate && ` to ${new Date(filterEndDate).toLocaleDateString()}`}
                </p>
              </div>
            )}
          </div>

          <div className="p-6">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600 mr-3" />
                <span className="text-slate-600">Loading travel history...</span>
              </div>
            ) : displayTravels.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">
                  {isFiltering ? "No matching records found" : "No travel records found"}
                </p>
                <p className="text-slate-400 mt-2">
                  {isFiltering ? "Try adjusting your filter criteria" : "Your travel submissions will appear here"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayTravels.map((travel, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {/* Main Row - Always Visible */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-grow">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Travel Date</p>
                            <p className="text-sm font-medium text-gray-900">
                              {travel.travelDate === "Invalid Date" ? "-" : travel.travelDate}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Route</p>
                            <p className="text-sm text-gray-900">{travel.fromLocation} → {travel.toLocation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Vehicle</p>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {travel.vehicleType}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Days</p>
                            <p className="text-sm text-gray-900">{travel.noOfDays}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleRowExpansion(index)}
                          className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {expandedRows[index] ? 
                            <ChevronUp className="h-5 w-5" /> : 
                            <ChevronDown className="h-5 w-5" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedRows[index] && (
                      <div className="px-6 py-4 space-y-6">
                        {/* Basic Information */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Accommodation Type</p>
                              <p className="text-sm text-gray-900">{travel.accommodationType || '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Return Date</p>
                              <p className="text-sm text-gray-900">{travel.returnDate === "Invalid Date" ? "-" : travel.returnDate}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Local Travel Type</p>
                              <p className="text-sm text-gray-900">{travel.localTravelType || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Advance Amount */}
                        {travel.advanceAmount && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Advance Amount</h4>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <p className="text-sm text-gray-900">{travel.advanceAmount}</p>
                            </div>
                          </div>
                        )}

                        {/* Bills and Receipts */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Bills & Receipts</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h5 className="text-sm font-semibold text-blue-900 mb-2">Stay Bill</h5>
                              {renderFileUploadStatus(travel.stayBillUploaded, travel.stayBillLink, "Stay Bill")}
                            </div>
                            
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h5 className="text-sm font-semibold text-green-900 mb-2">Travel Receipt</h5>
                              {renderFileUploadStatus(travel.travelReceiptUploaded, travel.travelReceiptLink, "Travel Receipt")}
                            </div>
                            
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                              <h5 className="text-sm font-semibold text-purple-900 mb-2">Local Travel Receipt</h5>
                              {renderFileUploadStatus(travel.localTravelReceiptUploaded, travel.localTravelReceiptLink, "Local Travel Receipt")}
                            </div>
                            
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <h5 className="text-sm font-semibold text-orange-900 mb-2">Return Ticket</h5>
                              {renderFileUploadStatus(travel.returnTicketUploaded, travel.returnTicketLink, "Return Ticket")}
                            </div>
                          </div>
                        </div>

                        {/* Fooding Bills */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Food Bills</h4>
                          {travel.foodingData?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {travel.foodingData.map((bill, billIndex) => (
                                <div key={billIndex} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <h5 className="text-sm font-semibold text-indigo-900">Food Bill {billIndex + 1}</h5>
                                      <p className="text-xs text-indigo-700 mt-1">Date: {bill.date}</p>
                                    </div>
                                    <button
                                      onClick={() => viewFoodingBill(bill.billLink)}
                                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-gray-500">No food bills uploaded</p>
                            </div>
                          )}
                        </div>

                        {/* Admin Information */}
                        {userRole === "Admin" && (
                          <div className="pt-4 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-500">Submitted by: 
                              <span className="text-gray-900 ml-1">{travel.personName}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelHistory;