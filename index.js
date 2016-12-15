/**
 * Created by K2 on 12/12/2016.
 */
// Library Code
//At this point only mp4 video is created.
var aws = require('aws-sdk');
var elastictranscoder = new aws.ElasticTranscoder();
var path = require('path');
// return basename without extension
function basename(path) {
    return path.split('/').reverse()[0].split('.')[0];
}

// return output file name with timestamp and extension
function outputKey(name, ext) {
    return name + '_trans.' + ext ;
}




function notifySonicspan(filename, context){
    var lambda = new aws.Lambda({
        region: process.env.region
    });
    var params = {
        FunctionName: process.env.functionName,
        Payload: JSON.stringify({"data": filename})
    };
    console.log('inside notification blob ...' + filename);
    lambda.invoke(params, function(error, data) {
        console.log(data);
        if (error) {
            console.log('Error on notifying... ' + error);
            context.done('error', error);
        }
        if(data.Payload){

            context.succeed(data.Payload)
        }
    });
}
exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    // Get the object from the event and show its content type
    var key = event.Records[0].s3.object.key;
    var filename = path.basename(key);
    var params = {
        Input: {
            Key: key
        },
        PipelineId: process.env.pipelineId,
        // OutputKeyPrefix: 'transecoded/',
        OutputKeyPrefix: 'transcodedaudios/',
        Outputs: [
            {
                Key: outputKey(basename(key),'mp3'),
                PresetId: '1351620000001-300040', /*Audio MP3 - 128 kilobits/second*/
            }
        ]
    };

    elastictranscoder.createJob(params, function(err, data) {
        console.log('Converting the Audio is done for ' + filename);
        if (err){
            console.log(err, err.stack); // an error occurred
            context.fail();
            return;
        }
        /** Notify Sonicspan */
        console.log('Notfying sonicspan for ' + filename);
        notifySonicspan(filename, context);
        //context.succeed();
    });
};
