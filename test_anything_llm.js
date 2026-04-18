(async () => {
  const model = "inf_work"; // your workspace
  const endpoint = "https://ycoffice.tail36f59d.ts.net/api/v1/openai/chat/completions";
  // The user needs to paste their key:
  const apiKey = "DUMMY"; 
  
  console.log("Testing with json_object format...");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{role: "system", content: "返回 JSON 格式: {\"sentences\":[]}"}, {role: "user", content: "产业大脑"}]
    })
  });
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
})();
