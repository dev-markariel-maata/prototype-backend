import express from "express";
import { injectClient } from "../middleware/client";
import path from "path";
import fs from "fs";
import { CSVData } from "../types/csv";
import { uploadCSV } from "../services/csv";
import { createAutofill, getAutofill } from "../services/canva/autofilljob";
import { CreateAutofill, GetAutofill, TemplateDataset } from "../types/autofill";
import { setDesignData } from "../services/queries/designs";
import { completionsBack, completionsFront } from "../services/openai";
import { getTemplateDataset, getTemplateList } from "../services/canva/template";
const Papa = require("papaparse");

const router = express.Router()
router.use(injectClient)
const api = process.env.CANVA_CONNECT_API;

const endpoints = {
  BULK_GENERATE: "/bulk-autofill",
};


router.get("/sample", async(req, res) => {
  const frontTemplates: TemplateDataset[] = [];
  const backTemplates: TemplateDataset[] = [];
  
  const token = req.token;

  // Get list of templates and its dataset
  const templateList = await getTemplateList(token);

  // Collect promises for fetching datasets
  const templateDatasetPromises = templateList.data.items.map(async (template: { id: string; title: any; }) => {
    try {
      const datasetResponse = await getTemplateDataset(template.id, token);
      if (datasetResponse.status === 200) {
        const templateData = {
          title: template.title,
          id: template.id,
          dataset: datasetResponse.data
        };

        // Return the template data for further processing
        return templateData;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching dataset for template ${template.id}:`, error);
      return null;
    }
  });

  // Wait for all promises to resolve
  const templateDataset = (await Promise.all(templateDatasetPromises)).filter(item => item !== null);

  // Assign to frontTemplates and backTemplates
  for (const templateData of templateDataset) {
    if (templateData.title.includes("Front")) {
      frontTemplates.push(templateData);
    } else if (templateData.title.includes("Back")) {
      backTemplates.push(templateData);
    }
  }

  const bestTemplate = "Modern-Front";
  const backTemplateTitle = bestTemplate.replace('Front', 'Back')
  const selectedBackTemplate = backTemplates.find(t => t.title === backTemplateTitle);

  const information = `Information:
                Company Name: TechCo Inc

                Industry: IT 
                Content Type: job_description
                Title: Engineer Wanted
                Mood: energetic`;

  const completionsRes = await completionsBack(selectedBackTemplate?.dataset, information, 1)

  const completionsResJSON = JSON.parse(completionsRes.choices[0].message.content)

  completionsResJSON.forEach((item: any, index:number) => {
    console.log(`Dataset ${index + 1}:`);
    console.log(JSON.stringify(item.dataset, null, 2));
    console.log('----------------------');
  });

  res.send(`<pre>${JSON.stringify(completionsRes, null, 2)}</pre>`);
})


router.post(endpoints.BULK_GENERATE, uploadCSV.single('file'), async (req, res) => {
  try {
    const numberOfBackDesign = req.body.numberOfDesign
    const token = req.token;
    const createAutofillJobList: CreateAutofill[] = [];
    const getAutofillJobList: GetAutofill[] = [];
    let createAutofillPromises: any;
    const frontTemplates: TemplateDataset[] = [];
    const backTemplates: TemplateDataset[] = [];
    
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded'});
    }


    // Get list of templates and its dataset
    const templateList = await getTemplateList(token);

    // Collect promises for fetching datasets
    const templateDatasetPromises = templateList.data.items.map(async (template: { id: string; title: any; }) => {
      try {
        const datasetResponse = await getTemplateDataset(template.id, token);
        if (datasetResponse.status === 200) {
          const templateData = {
            title: template.title,
            id: template.id,
            dataset: datasetResponse.data
          };

          // Return the template data for further processing
          return templateData;
        }
        return null;
      } catch (error) {
        console.error(`Error fetching dataset for template ${template.id}:`, error);
        return null;
      }
    });

    // Wait for all promises to resolve
    const templateDataset = (await Promise.all(templateDatasetPromises)).filter(item => item !== null);

    // Assign to frontTemplates and backTemplates
    for (const templateData of templateDataset) {
      if (templateData.title.includes("Front")) {
        frontTemplates.push(templateData);
      } else if (templateData.title.includes("Back")) {
        backTemplates.push(templateData);
      }
    }

    
    // Parse CSV file
    const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
    const csvFile = fs.readFileSync(filePath, 'utf8');
    Papa.parse(csvFile, {
      header: true,
      complete: async function (results: { data: any; }) {
        const data:CSVData[] = results.data;

        createAutofillPromises = data.map(async (item) => {
          if (item.company_name && item.company_name.trim() !== "") {
            try {
              const information = `Information:
                Company Name: ${item.company_name}
                Industry: ${item.industry}
                Content Type: ${item.content_type}
                Title: ${item.title}
                Mood: ${item.mood}`;

              // Openai completion request
              const completionsFrontRes = await completionsFront(frontTemplates, information)
              // Get the response dataset from openai completion
              const responseMessage = completionsFrontRes.choices[0].message.content
              const responseJSONString = responseMessage.replace(/\\"/g, '"');
              const datasetStart = responseJSONString.indexOf('{');
              const datasetEnd = responseJSONString.lastIndexOf('}') + 1;
              const datasetString = responseJSONString.substring(datasetStart, datasetEnd);
              const jsonDatasetParse = JSON.parse(datasetString);
              const datasetBody = jsonDatasetParse.dataset;

              const bestTemplateLine = responseJSONString.split('\n')[0]; // Get the first line
              const bestTemplate = bestTemplateLine.split(': ')[1]; // Extract the value after "Best Template:"
              const selectedTemplate = templateDataset.find(item => item.title === bestTemplate)?.id;

              const requestBody = {
                brand_template_id: selectedTemplate, 
                title: item.title + ' - Front Design' || "Default Title",
                data: {
                  ...datasetBody 
                },
              };
              
              const createAutofillJob = await createAutofill(requestBody, token);
              const newAutofill = {
                company_name: item.company_name,
                job: {
                  id: createAutofillJob.data.job.id,
                  status: createAutofillJob.data.job.status
                }
              };
              createAutofillJobList.push(newAutofill);

              // Process for the back designs
              const backTemplateTitle = bestTemplate.replace('Front', 'Back')
              const selectedBackTemplate = backTemplates.find(t => t.title === backTemplateTitle);
              const completionsBackRes = await completionsBack(selectedBackTemplate?.dataset, information, numberOfBackDesign)
              const completionsResJSON = JSON.parse(completionsBackRes.choices[0].message.content)
            
              completionsResJSON.forEach(async(backItem: any, index:number) => {
                const backRequestBody = {
                  brand_template_id: selectedBackTemplate?.id, 
                  title: item.title + ' back design' || "Default Title",
                  data: backItem.dataset,
                };
                const backAutofillJob = await createAutofill(backRequestBody, token);
                const newAutofill: CreateAutofill = {
                  company_name: item.company_name,
                  job: {
                    id: backAutofillJob.data.job.id,
                    status: backAutofillJob.data.job.status
                  }
                };
                createAutofillJobList.push(newAutofill);
              });

            } catch (err) {
              console.error(`Error processing item: ${item.company_name}`, err);
            }
          }
        })

      },
      error: function (err: any) {
        console.error("Error parsing CSV:", err);
        res.status(400).send({ message: "Error parsing CSV file" });
      }
    });

    await Promise.all(createAutofillPromises)

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(10000);
    
    const getAutofillPromises = createAutofillJobList.map(async (result: CreateAutofill) => {
      if (result.job.id) {
        try {
          const jobResponse = await getAutofill(result.job.id, token);
          const newAutofill: GetAutofill = {
            company_name: result.company_name,
            job: {
              id: jobResponse.data.job.id,
              status: jobResponse.data.job.status,
              result: {
                type: jobResponse.data.job.result.type,
                design: {
                  id: jobResponse.data.job.result.design.id,
                  title: jobResponse.data.job.result.design.title,
                  url: jobResponse.data.job.result.design.url,
                  thumbnail: {
                    url: jobResponse.data.job.result.design.thumbnail.url
                  },
                  urls: {
                    edit_url: jobResponse.data.job.result.design.urls.edit_url,
                    view_url: jobResponse.data.job.result.design.urls.view_url
                  },
                  created_at: jobResponse.data.job.result.design.created_at, 
                  updated_at: jobResponse.data.job.result.design.updated_at 
                }
              }
            }        
          };
          getAutofillJobList.push(newAutofill); 
        } catch (error) {
          console.error(`Error processing second API call for job ID: ${result.job.id}`, error);
        }
      }
    });

    await Promise.all(getAutofillPromises);
    
    getAutofillJobList.sort((a, b) => a.company_name.localeCompare(b.company_name));

    await setDesignData(getAutofillJobList);

    fs.unlinkSync(filePath);

    res.send(getAutofillJobList);
  } catch (error) {
    console.error("Error in /bulk-generate route:", error);
    res.status(400).send({ message: "Error processing request" });
  }
})

export default router;